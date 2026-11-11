import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addResearch, createBrand } from "@/lib/services/brands";
import { getCampaign, parseBrief, planCampaignFromBrand } from "@/lib/services/campaigns";
import { ensureEmailMeta, getEmail, saveDraft, setEmailStatus, createVersion, restoreVersion } from "@/lib/services/emails";
import { buildClientPackage } from "@/lib/services/export";
import { getWorkflow } from "@/lib/services/workflow";
import { exportBackup, importBackup } from "@/lib/services/backup";
import { generateEmailDraft } from "@/lib/services/ai";
import { logActivity } from "@/lib/services/settings";
import { toDocx } from "@/lib/export/docx";
import { toMarkdown, toPlainText } from "@/lib/export/package";
import { composeBody, suggestionsFor } from "@/lib/writing/assist";
import { emailContentOf, toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { DEMO_BRAND } from "@/lib/services/demo";

describe("V2 three-email workflow without an API key", () => {
  it("plans, writes with the guided assist, approves, and exports a complete package", async () => {
    const brand = await createBrand({ ...DEMO_BRAND, name: "Hushwell (V2 test)" });
    await addResearch({ brandId: brand.id, title: "Spec sheet", url: "https://example.com/spec", kind: "url", category: "benefit", content: "Molded eye cups leave space for eyelashes.", status: "verified" });

    let wf = await getWorkflow({ brandId: brand.id });
    expect(wf.steps.find((s) => s.key === "campaign")?.status).toBe("todo");

    // One-click planning
    const created = await planCampaignFromBrand(brand.id);
    const campaign = (await getCampaign(created.id))!;
    expect(campaign.type).toBe("welcome");
    expect(campaign.emails).toHaveLength(3);
    const brief = parseBrief(campaign.brief)!;
    expect(brief.emails.map((e) => e.framework)).toEqual(["AIDA", "PAS", "Story-Based"]);
    expect(JSON.parse(campaign.emails[0].researchRefs)).toContain("Spec sheet");

    // Write each email from rule-based suggestions (what the guided writer does)
    const profile = toBrandProfile(campaign.brand);
    const research = campaign.brand.researchSources.map(toResearchItem);
    for (const e of campaign.emails) {
      const plan = brief.emails.find((b) => b.position === e.position)!;
      const pick = (step: Parameters<typeof suggestionsFor>[0]) => suggestionsFor(step, { brand: profile, research, plan }).map((s) => s.text);
      const sections = { problem: pick("problem")[0], benefit: pick("benefit")[0], transition: pick("transition")[0] };
      const subjects = [...pick("subject"), "Backup subject one", "Backup subject two"].slice(0, 3);
      await saveDraft(
        e.id,
        { subjectLines: subjects, selectedSubject: 0, previewText: pick("preview")[0], hook: pick("hook")[0], body: composeBody(sections), cta: pick("cta")[0], rationale: pick("rationale")[0], researchRefs: JSON.parse(e.researchRefs), sections },
        undefined,
        { assisted: true },
      );
      const saved = (await getEmail(e.id))!;
      expect(saved.contentOrigin).toBe("guided");
      expect(emailContentOf(saved).sections.benefit).toBe(sections.benefit);
      await setEmailStatus(e.id, "approved");
    }

    // Versions keep sections and restore them
    const first = campaign.emails[0].id;
    const v = await createVersion(first, "checkpoint");
    expect(JSON.parse(v.sections).problem).toBeTruthy();

    // Export with every email complete
    const pkg = await buildClientPackage(campaign.id);
    expect(pkg.emails).toHaveLength(3);
    for (const e of pkg.emails) {
      expect(e.approved).toBe(true);
      expect(e.subjectLines.filter(Boolean)).toHaveLength(3);
      expect(e.previewText && e.cta && e.rationale && e.body).toBeTruthy();
      expect(e.researchRefs.length).toBeGreaterThan(0);
    }
    const md = toMarkdown(pkg);
    expect(md).toContain("## Campaign strategy");
    expect(md).not.toMatch(/not yet approved/);
    expect(toPlainText(pkg)).toContain("EMAIL 3");
    expect((await toDocx(pkg)).subarray(0, 2).toString()).toBe("PK");
    expect(md).not.toContain("editorId");

    await logActivity({ type: "export", message: "test export", entityType: "campaign", entityId: campaign.id });
    wf = await getWorkflow({ campaignId: campaign.id });
    expect(wf.steps.map((s) => [s.key, s.status])).toEqual([
      ["brand", "complete"],
      ["research", "complete"],
      ["campaign", "complete"],
      ["email-1", "complete"],
      ["email-2", "complete"],
      ["email-3", "complete"],
      ["review", "complete"],
      ["export", "complete"],
    ]);

    // Restoring an earlier version brings its sections back
    await saveDraft(first, { ...emailContentOf((await getEmail(first))!), sections: { problem: "changed", benefit: "", transition: "" }, body: "changed" });
    await restoreVersion(first, v.id);
    expect(emailContentOf((await getEmail(first))!).sections.problem).not.toBe("changed");
  });

  it("autosave with partial meta keeps the email's role and framework (regression)", async () => {
    const e = await db.campaignEmail.findFirstOrThrow({ where: { role: { not: "" } } });
    await saveDraft(e.id, { ...emailContentOf(e), body: "Autosaved body" }, { objective: "New objective", segment: "New segment" });
    const after = (await getEmail(e.id))!;
    expect(after.role).toBe(e.role);
    expect(after.framework).toBe(e.framework);
    expect(after.objective).toBe("New objective");
  });

  it("repairs emails whose role/framework were blanked, without touching filled fields", async () => {
    const e = await db.campaignEmail.findFirstOrThrow({ where: { role: { not: "" } } });
    await db.campaignEmail.update({ where: { id: e.id }, data: { role: "", framework: "" } });
    expect(await ensureEmailMeta(e.campaignId)).toBe(1);
    const after = (await getEmail(e.id))!;
    expect(after.role).toBe(e.role);
    expect(after.framework).toBe(e.framework);
    expect(after.objective).toBe("New objective");
    expect(await ensureEmailMeta(e.campaignId)).toBe(0);
  });

  it("AI generation stays optional and clearly refused without credentials", async () => {
    const e = await db.campaignEmail.findFirstOrThrow();
    await expect(generateEmailDraft(e.id)).rejects.toMatchObject({ code: "not_configured" });
  });

  it("backups made before V2 (no sections/links fields) still import", async () => {
    const backup = JSON.parse(JSON.stringify(await exportBackup()));
    for (const p of backup.data.products) delete p.links;
    for (const e of backup.data.campaignEmails) delete e.sections;
    for (const v of backup.data.emailDraftVersions) delete v.sections;
    const before = await db.campaignEmail.count();
    await importBackup(backup);
    expect(await db.campaignEmail.count()).toBe(before);
  });
});
