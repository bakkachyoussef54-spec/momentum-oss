import { z } from "zod";
import { db } from "../db";
import { logActivity } from "./settings";

const BACKUP_VERSION = 1;

const dateLike = z.union([z.string(), z.date()]).transform((v) => new Date(v));
const nullableDate = z.union([z.string(), z.date(), z.null()]).transform((v) => (v === null ? null : new Date(v)));
const str = z.string().max(100_000);

const brandRow = z.object({ id: str, name: str, website: str, instagramUrl: str, toneOfVoice: str, competitors: str, restrictions: str, researchNotes: str, isDemo: z.boolean(), archivedAt: nullableDate, createdAt: dateLike });
const productRow = z.object({ id: str, brandId: str, name: str, category: str, description: str, targetAudience: str, painPoints: str, desires: str, features: str, benefits: str, usp: str, testimonials: str, objections: str, pricing: str, links: str.default(""), createdAt: dateLike });
const researchRow = z.object({ id: str, brandId: str, title: str, url: str, kind: str, category: str, content: str, status: str, flags: str, createdAt: dateLike });
const campaignRow = z.object({ id: str, brandId: str, productId: z.string().nullable(), name: str, type: str, audience: str, goal: str, tone: str, emailCount: z.number().int(), status: str, brief: str, isDemo: z.boolean(), archivedAt: nullableDate, createdAt: dateLike });
const emailRow = z.object({ id: str, campaignId: str, position: z.number().int(), role: str, objective: str, framework: str, segment: str, subjectLines: str, selectedSubject: z.number().int(), previewText: str, hook: str, body: str, cta: str, rationale: str, researchRefs: str, sections: str.default("{}"), contentOrigin: str, status: str, approvedVersionId: z.string().nullable(), createdAt: dateLike });
const versionRow = z.object({ id: str, emailId: str, versionNumber: z.number().int(), subjectLines: str, selectedSubject: z.number().int(), previewText: str, hook: str, body: str, cta: str, rationale: str, researchRefs: str, sections: str.default("{}"), origin: str, label: str, aiModel: str, createdAt: dateLike });
const analysisRow = z.object({ id: str, emailId: z.string().nullable(), totalScore: z.number().int(), breakdown: str, flags: str, improvements: str, method: str, createdAt: dateLike });
const templateRow = z.object({ id: str, slug: str, name: str, category: str, goal: str, framework: str, outline: str, subjectLines: str, previewText: str, hook: str, body: str, cta: str, personalization: str, isBuiltIn: z.boolean(), createdAt: dateLike });

export const backupSchema = z.object({
  app: z.literal("youssefcopy-studio"),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  data: z.object({
    brands: z.array(brandRow),
    products: z.array(productRow),
    researchSources: z.array(researchRow),
    campaigns: z.array(campaignRow),
    campaignEmails: z.array(emailRow),
    emailDraftVersions: z.array(versionRow),
    copywritingAnalyses: z.array(analysisRow),
    templates: z.array(templateRow),
  }),
});
export type Backup = z.infer<typeof backupSchema>;

function strip<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    delete copy.updatedAt;
    return copy;
  });
}

export async function exportBackup() {
  const [brands, products, researchSources, campaigns, campaignEmails, emailDraftVersions, copywritingAnalyses, templates] = await Promise.all([
    db.brand.findMany(),
    db.product.findMany(),
    db.researchSource.findMany(),
    db.campaign.findMany(),
    db.campaignEmail.findMany(),
    db.emailDraftVersion.findMany(),
    db.copywritingAnalysis.findMany(),
    db.template.findMany({ where: { isBuiltIn: false } }),
  ]);
  return {
    app: "youssefcopy-studio" as const,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      brands: strip(brands),
      products: strip(products),
      researchSources: strip(researchSources),
      campaigns: strip(campaigns),
      campaignEmails: strip(campaignEmails),
      emailDraftVersions: strip(emailDraftVersions),
      copywritingAnalyses: strip(copywritingAnalyses),
      templates: strip(templates),
    },
  };
}

/**
 * Non-destructive import: records are upserted by id, so existing data is updated but never
 * deleted. Runs in a single transaction — a malformed file changes nothing.
 */
export async function importBackup(raw: unknown) {
  const backup = backupSchema.parse(raw);
  const d = backup.data;
  await db.$transaction(async (tx) => {
    for (const r of d.brands) await tx.brand.upsert({ where: { id: r.id }, create: r, update: r });
    for (const r of d.products) await tx.product.upsert({ where: { id: r.id }, create: r, update: r });
    for (const r of d.researchSources) await tx.researchSource.upsert({ where: { id: r.id }, create: r, update: r });
    for (const r of d.campaigns) await tx.campaign.upsert({ where: { id: r.id }, create: r, update: r });
    for (const r of d.campaignEmails) await tx.campaignEmail.upsert({ where: { id: r.id }, create: r, update: r });
    for (const r of d.emailDraftVersions) await tx.emailDraftVersion.upsert({ where: { id: r.id }, create: r, update: r });
    for (const r of d.copywritingAnalyses) await tx.copywritingAnalysis.upsert({ where: { id: r.id }, create: r, update: r });
    for (const r of d.templates) await tx.template.upsert({ where: { id: r.id }, create: { ...r, isBuiltIn: false }, update: { ...r, isBuiltIn: false } });
  });
  const counts = { brands: d.brands.length, campaigns: d.campaigns.length, emails: d.campaignEmails.length };
  await logActivity({ type: "backup.imported", message: `Imported backup: ${counts.brands} brands, ${counts.campaigns} campaigns, ${counts.emails} emails` });
  return counts;
}
