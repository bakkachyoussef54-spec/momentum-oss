import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { addResearch, createBrand } from "@/lib/services/brands";
import { getCampaign, planCampaignFromBrand } from "@/lib/services/campaigns";
import { applyTemplateToEmail, getEmail, saveDraft, setEmailStatus } from "@/lib/services/emails";
import { generateEmailDraft, proposeRevision, reviewWithAi, testAiConnection } from "@/lib/services/ai";
import { getAiStatus, saveAiSettings } from "@/lib/services/settings";
import { buildClientPackage } from "@/lib/services/export";
import { emailContentOf } from "@/lib/services/mappers";
import { DEMO_BRAND } from "@/lib/services/demo";
import { resetTestDb } from "./reset";

/**
 * Hybrid workflow through the real services and database, with the AI provider MOCKED:
 * global fetch is stubbed to behave like an Ollama server. No real model is called here.
 */
const draft = {
  objective: "Introduce the contour mask and its main benefit",
  subjectLines: ["Darker mornings, starting tonight", "A mask that doesn't press", "Why flat masks feel wrong"],
  previewText: "The small design change that makes light-blocking comfortable.",
  hook: "If the sunrise wakes you before your alarm, you're not alone.",
  body: "Most people who try a sleep mask give up because of the pressure on their eyes.\n\nThe Lunora Contour Sleep Mask uses molded eye cups, so it blocks light without touching your eyes.",
  cta: "See how the contour works",
  segment: "New subscribers who have not purchased",
  rationale: "AIDA: the hook names the problem, the body connects one verified benefit, and the CTA is low-commitment.",
  researchRefs: ["Profile: benefits", "Spec sheet"],
  missingInformation: ["No verified customer reviews"],
};

let lastBody: Record<string, unknown> | null = null;
function ollamaMock(reply: (body: Record<string, unknown>) => unknown) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/api/version")) return Response.json({ version: "mock" });
    if (url.endsWith("/api/tags")) return Response.json({ models: [{ name: "qwen3:1.7b" }] });
    lastBody = JSON.parse(String(init?.body));
    return Response.json({ model: "qwen3:1.7b", message: { content: JSON.stringify(reply(lastBody!)) }, prompt_eval_count: 900, eval_count: 300 });
  });
}

describe("Hybrid Edition: Human + AI modes (mocked Ollama)", () => {
  let campaignId = "";
  let emailIds: string[] = [];

  beforeAll(async () => {
    await resetTestDb();
    const brand = await createBrand({ ...DEMO_BRAND, name: "Hybrid Test Brand" });
    await addResearch({ brandId: brand.id, title: "Spec sheet", url: "https://example.com/spec", kind: "url", category: "benefit", content: "Molded eye cups leave space for eyelashes.", status: "verified" });
    campaignId = (await planCampaignFromBrand(brand.id)).id;
    emailIds = (await getCampaign(campaignId))!.emails.map((e) => e.id);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("Human Mode needs no provider; AI Mode reports why it is unavailable", async () => {
    expect((await getAiStatus()).available).toBe(false);
    await expect(generateEmailDraft(emailIds[0])).rejects.toMatchObject({ code: "not_configured" });
    expect((await testAiConnection()).ok).toBe(false);
  });

  it("switches to Ollama from settings and tests the connection", async () => {
    await saveAiSettings({ provider: "ollama", model: "qwen3:1.7b", length: "short" });
    const status = await getAiStatus();
    expect(status).toMatchObject({ available: true, provider: "ollama", model: "qwen3:1.7b", isLocal: true });
    vi.stubGlobal("fetch", ollamaMock(() => ({})));
    expect(await testAiConnection()).toMatchObject({ ok: true, modelAvailable: true });
  });

  it("generates a research-grounded AI-assisted draft and keeps the previous draft in history", async () => {
    await saveDraft(emailIds[0], { subjectLines: ["Human subject", "", ""], selectedSubject: 0, previewText: "", hook: "Human hook", body: "Human-written body copy for this email.", cta: "Go", rationale: "", researchRefs: [] }, undefined, { assisted: true });
    vi.stubGlobal("fetch", ollamaMock(() => draft));
    const r = await generateEmailDraft(emailIds[0], undefined, { prefs: { tone: "Warm", framework: "AIDA" } });
    expect(r.missingInformation).toEqual(["No verified customer reviews"]);
    expect(r.usage).toMatchObject({ model: "qwen3:1.7b", inputTokens: 900, outputTokens: 300, estimatedCostUsd: 0 });
    const prompt = (lastBody!.messages as { content: string }[])[1].content;
    expect(prompt).toContain("<verified_research>");
    expect(prompt).toContain("Molded eye cups leave space for eyelashes.");
    expect(prompt).toContain("Tone: Warm");
    expect(prompt).toContain("Body length: 80–140 words");
    expect(lastBody!.format).toMatchObject({ type: "object" });
    const e = (await getEmail(emailIds[0]))!;
    expect(e.contentOrigin).toBe("ai");
    expect(e.framework).toBe("AIDA");
    expect(emailContentOf(e).subjectLines).toEqual(draft.subjectLines);
    expect(e.versions.some((v) => v.body === "Human-written body copy for this email." && v.origin === "guided")).toBe(true);
    expect(e.versions[0]).toMatchObject({ origin: "ai", aiModel: "qwen3:1.7b" });
    expect(e.versions[0].label).toMatch(/AI-assisted/);
  });

  it("hybrid edit: a human edit of AI copy is labelled AI-assisted · human-edited", async () => {
    const e = (await getEmail(emailIds[0]))!;
    await saveDraft(emailIds[0], { ...emailContentOf(e), cta: "Find your fit" });
    expect((await getEmail(emailIds[0]))!.contentOrigin).toBe("ai_edited");
  });

  it("targeted AI revisions are proposals only — nothing changes until accepted", async () => {
    const before = (await getEmail(emailIds[0]))!;
    vi.stubGlobal("fetch", ollamaMock(() => ({ options: ["Hook A", "Hook B", "Hook C"], changeSummary: "Three hooks" })));
    const { proposal } = await proposeRevision(emailIds[0], "hook_options", undefined);
    expect(proposal.options).toEqual(["Hook A", "Hook B", "Hook C"]);
    expect((await getEmail(emailIds[0]))!.hook).toBe(before.hook);
  });

  it("refuses to replace an approved email without explicit confirmation", async () => {
    await setEmailStatus(emailIds[0], "approved");
    vi.stubGlobal("fetch", ollamaMock(() => ({ ...draft, body: "Replacement body that should not be saved without confirmation." })));
    await expect(generateEmailDraft(emailIds[0])).rejects.toMatchObject({ code: "approved_locked" });
    const t = await db.template.findFirstOrThrow({ where: { isBuiltIn: true } }).catch(async () => {
      await (await import("@/lib/services/templates")).ensureBuiltInTemplates();
      return db.template.findFirstOrThrow({ where: { isBuiltIn: true } });
    });
    await expect(applyTemplateToEmail(emailIds[0], t.id)).rejects.toThrow(/approved/);
    expect((await getEmail(emailIds[0]))!.body).toBe(draft.body);
    // With confirmation it proceeds; the approved snapshot still drives the export.
    await generateEmailDraft(emailIds[0], undefined, { overwriteApproved: true });
    const pkg = await buildClientPackage(campaignId);
    expect(pkg.emails[0].approved).toBe(true);
    expect(pkg.emails[0].body).toBe(draft.body);
    expect(pkg.emails[0].editedSinceApproval).toBe(true);
  });

  it("refuses to write when research is insufficient, explaining what is missing", async () => {
    const thin = await createBrand({ ...DEMO_BRAND, name: "Thin Brand", product: { ...DEMO_BRAND.product, description: "", targetAudience: "", benefits: "", painPoints: "" } });
    const c = await planCampaignFromBrand(thin.id);
    const e = (await getCampaign(c.id))!.emails[0];
    vi.stubGlobal("fetch", ollamaMock(() => draft));
    await expect(generateEmailDraft(e.id)).rejects.toMatchObject({ code: "insufficient_research", message: expect.stringMatching(/Product description.*Target audience/) });
  });

  it("invalid model output changes nothing", async () => {
    const before = (await getEmail(emailIds[1]))!;
    vi.stubGlobal("fetch", ollamaMock(() => ({ subjectLines: [], body: "short" })));
    await expect(generateEmailDraft(emailIds[1])).rejects.toMatchObject({ code: "invalid_response" });
    expect((await getEmail(emailIds[1]))!.versions.length).toBe(before.versions.length);
  });

  it("optional AI editorial review is stored separately from heuristic scores", async () => {
    vi.stubGlobal(
      "fetch",
      ollamaMock(() => ({
        summary: "Clear and grounded.",
        categories: [
          { key: "audience", score: 8, comment: "Speaks to light-sensitive sleepers." },
          { key: "factual", score: 9, comment: "All claims trace to the brief." },
        ],
        improvements: ["Tighten the hook", "Name the objection", "Shorten paragraph two"],
        factualConcerns: [],
      })),
    );
    const { review } = await reviewWithAi(emailIds[0]);
    expect(review.total).toBe(85);
    expect(review.improvements).toHaveLength(3);
    const stored = await db.copywritingAnalysis.findFirstOrThrow({ where: { emailId: emailIds[0] } });
    expect(stored.method).toBe("ai:qwen3:1.7b");
  });

  it("cancellation aborts the request and leaves the draft untouched", async () => {
    const before = (await getEmail(emailIds[1]))!;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))),
    );
    const controller = new AbortController();
    const p = generateEmailDraft(emailIds[1], controller.signal);
    setTimeout(() => controller.abort(), 20);
    await expect(p).rejects.toMatchObject({ code: "cancelled" });
    expect((await getEmail(emailIds[1]))!.body).toBe(before.body);
  });
});
