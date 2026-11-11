import { beforeAll, describe, expect, it } from "vitest";
import { addResearch, createBrand } from "@/lib/services/brands";
import { getCampaign, planCampaignFromBrand } from "@/lib/services/campaigns";
import { getEmail } from "@/lib/services/emails";
import { generateEmailDraft, proposeRevision, testAiConnection } from "@/lib/services/ai";
import { saveAiSettings } from "@/lib/services/settings";
import { emailContentOf, toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { analyzeEmail } from "@/lib/analyzer";
import { findHealthClaims } from "@/lib/compliance";
import { DEMO_BRAND } from "@/lib/services/demo";
import { resetTestDb } from "../integration/reset";

/**
 * REAL local test against a running Ollama server (not mocked).
 * Runs only with OLLAMA_LIVE=1, e.g.:  OLLAMA_LIVE=1 npm test -- tests/live
 * Optional: OLLAMA_BASE_URL (default http://127.0.0.1:11434), OLLAMA_MODEL (default qwen3:1.7b).
 */
describe("LIVE Ollama generation", () => {
  let emailId = "";

  beforeAll(async () => {
    await resetTestDb();
    await saveAiSettings({ provider: "ollama", model: process.env.OLLAMA_MODEL ?? "qwen3:1.7b", baseUrl: process.env.OLLAMA_BASE_URL ?? "", length: "short", timeoutSeconds: 600 });
    const brand = await createBrand({ ...DEMO_BRAND, name: "Live Ollama Brand" });
    await addResearch({ brandId: brand.id, title: "Spec sheet", url: "https://example.com/spec", kind: "url", category: "benefit", content: "Molded eye cups leave space for eyelashes.", status: "verified" });
    const c = await planCampaignFromBrand(brand.id);
    emailId = (await getCampaign(c.id))!.emails[0].id;
  });

  it("connects and finds the model", async () => {
    const r = await testAiConnection();
    console.log("[live] connection:", r.message);
    expect(r.ok).toBe(true);
  });

  it("generates a schema-valid, research-grounded draft", async () => {
    const t0 = Date.now();
    const r = await generateEmailDraft(emailId);
    const e = (await getEmail(emailId))!;
    const c = emailContentOf(e);
    console.log(`[live] draft in ${((Date.now() - t0) / 1000).toFixed(1)}s, tokens ${r.usage.inputTokens}+${r.usage.outputTokens}`);
    console.log("[live] subjects:", c.subjectLines);
    console.log("[live] hook:", c.hook);
    console.log("[live] body:\n" + c.body);
    console.log("[live] cta:", c.cta, "| missing:", r.missingInformation);
    expect(e.contentOrigin).toBe("ai");
    expect(c.body.length).toBeGreaterThan(40);
    expect(c.cta.length).toBeGreaterThan(1);
    expect(findHealthClaims([c.hook, c.body].join("\n"))).toEqual([]);
    const a = analyzeEmail({ ...c, segment: e.segment }, toBrandProfile(e.campaign.brand), e.campaign.brand.researchSources.map(toResearchItem));
    console.log("[live] heuristic score:", a.totalScore, "flags:", a.flags.map((f) => f.kind));
  }, 900_000);

  it("returns three CTA options as a proposal", async () => {
    const { proposal } = await proposeRevision(emailId, "cta_options", undefined);
    console.log("[live] CTA options:", proposal.options);
    expect(proposal.options?.length ?? 0).toBeGreaterThan(0);
  }, 900_000);
});
