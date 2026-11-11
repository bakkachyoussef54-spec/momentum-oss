import { db } from "../db";
import { validateResearch } from "../research/validate";
import { computeWorkflow, emailPackageChecks, type WorkflowStep } from "../workflow/steps";
import { emailContentOf, toBrandProfile, toResearchItem } from "./mappers";

export interface WorkflowContext {
  brandId: string | null;
  brandName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  steps: WorkflowStep[];
}

/** Resolve the workflow for a campaign, or for a brand's most recent campaign. */
export async function getWorkflow(target: { campaignId?: string | null; brandId?: string | null }): Promise<WorkflowContext> {
  let campaignId = target.campaignId ?? null;
  let brandId = target.brandId ?? null;
  if (campaignId) {
    const c = await db.campaign.findUnique({ where: { id: campaignId }, select: { brandId: true } });
    if (!c) campaignId = null;
    else brandId = c.brandId;
  }
  if (!campaignId && brandId) {
    const latest = await db.campaign.findFirst({ where: { brandId, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true } });
    campaignId = latest?.id ?? null;
  }
  const brand = brandId
    ? await db.brand.findUnique({ where: { id: brandId }, include: { products: { take: 1, orderBy: { createdAt: "asc" } }, researchSources: true } })
    : null;
  const campaign = campaignId ? await db.campaign.findUnique({ where: { id: campaignId }, include: { emails: { orderBy: { position: "asc" } } } }) : null;
  const lastExport = campaign
    ? await db.activityLog.findFirst({ where: { type: "export", entityId: campaign.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
    : null;

  const validation = brand ? validateResearch(toBrandProfile(brand), brand.researchSources.map(toResearchItem)) : null;
  const steps = computeWorkflow({
    brand:
      brand && validation
        ? {
            id: brand.id,
            requiredMissing: validation.missing.filter((m) => m.severity === "required").length,
            readiness: validation.readiness,
            researchCount: brand.researchSources.length,
            verifiedCount: validation.counts.verified,
          }
        : null,
    campaign: campaign
      ? {
          id: campaign.id,
          lastExportAt: lastExport?.createdAt ?? null,
          emails: campaign.emails.map((e) => {
            const c = emailContentOf(e);
            const check = emailPackageChecks({ ...c, position: e.position, approved: true });
            return {
              id: e.id,
              position: e.position,
              status: e.status,
              contentOrigin: e.contentOrigin,
              complete: check.checks.filter((x) => !x.label.startsWith("Approved")).every((x) => x.ok),
              updatedAt: e.updatedAt,
            };
          }),
        }
      : null,
  });
  return { brandId: brand?.id ?? null, brandName: brand?.name ?? null, campaignId: campaign?.id ?? null, campaignName: campaign?.name ?? null, steps };
}
