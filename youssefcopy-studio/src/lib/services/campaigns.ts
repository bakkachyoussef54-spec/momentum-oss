import type { CampaignType } from "../constants";
import { db } from "../db";
import { parseJson } from "../json";
import { buildCampaignBrief, campaignBriefSchema, type CampaignBrief } from "../strategy/playbooks";
import { campaignInputSchema, campaignStatusSchema, type CampaignInput } from "../validation";
import { toBrandProfile, toResearchItem } from "./mappers";
import { logActivity } from "./settings";

export function parseBrief(raw: string): CampaignBrief | null {
  return parseJson<CampaignBrief | null>(raw, campaignBriefSchema, null);
}

export async function listCampaigns(opts: { brandId?: string } = {}) {
  return db.campaign.findMany({
    where: { archivedAt: null, brand: { archivedAt: null }, ...(opts.brandId ? { brandId: opts.brandId } : {}) },
    orderBy: { updatedAt: "desc" },
    include: { brand: { select: { id: true, name: true } }, emails: { select: { id: true, status: true, contentOrigin: true } } },
  });
}

export async function getCampaign(id: string) {
  return db.campaign.findUnique({
    where: { id },
    include: {
      brand: { include: { products: { take: 1, orderBy: { createdAt: "asc" } }, researchSources: { orderBy: { createdAt: "desc" } } } },
      emails: { orderBy: { position: "asc" } },
    },
  });
}

/** Stage C/D: plan the brief from stored research, then create one email slot per strategic role. */
export async function createCampaign(raw: CampaignInput, opts: { isDemo?: boolean } = {}) {
  const input = campaignInputSchema.parse(raw);
  const brand = await db.brand.findUnique({
    where: { id: input.brandId },
    include: { products: { take: 1, orderBy: { createdAt: "asc" } }, researchSources: true },
  });
  if (!brand) throw new Error("Brand not found");
  const brief = buildCampaignBrief({
    type: input.type as CampaignType,
    emailCount: input.emailCount,
    audience: input.audience,
    goal: input.goal,
    tone: input.tone,
    brand: toBrandProfile(brand),
    research: brand.researchSources.map(toResearchItem),
  });
  const campaign = await db.campaign.create({
    data: {
      ...input,
      productId: brand.products[0]?.id ?? null,
      brief: JSON.stringify(brief),
      isDemo: opts.isDemo ?? false,
      emails: {
        create: brief.emails.map((e) => ({
          position: e.position,
          role: e.role,
          objective: e.objective,
          framework: e.framework,
          segment: e.segment,
        })),
      },
    },
  });
  await logActivity({ type: "campaign.created", message: `Created campaign ${campaign.name} (${input.emailCount} emails)`, entityType: "campaign", entityId: campaign.id, brandId: brand.id });
  return campaign;
}

/** Re-plan the brief from the latest research; email content is left untouched. */
export async function refreshBrief(id: string) {
  const c = await getCampaign(id);
  if (!c) throw new Error("Campaign not found");
  const brief = buildCampaignBrief({
    type: c.type as CampaignType,
    emailCount: c.emails.length,
    audience: c.audience,
    goal: c.goal,
    tone: c.tone,
    brand: toBrandProfile(c.brand),
    research: c.brand.researchSources.map(toResearchItem),
  });
  await db.campaign.update({ where: { id }, data: { brief: JSON.stringify(brief) } });
  return brief;
}

export async function setCampaignStatus(id: string, status: string) {
  const parsed = campaignStatusSchema.parse(status);
  const c = await db.campaign.update({ where: { id }, data: { status: parsed } });
  await logActivity({ type: "campaign.status", message: `Campaign ${c.name} marked ${parsed}`, entityType: "campaign", entityId: id, brandId: c.brandId });
  return c;
}

export async function setCampaignArchived(id: string, archived: boolean) {
  const c = await db.campaign.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  await logActivity({ type: archived ? "campaign.archived" : "campaign.restored", message: `${archived ? "Archived" : "Restored"} campaign ${c.name}`, entityType: "campaign", entityId: id, brandId: c.brandId });
  return c;
}

export async function deleteCampaign(id: string, confirmName: string) {
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) throw new Error("Campaign not found");
  if (confirmName.trim() !== c.name) throw new Error("Confirmation text does not match the campaign name");
  await db.campaign.delete({ where: { id } });
  await logActivity({ type: "campaign.deleted", message: `Permanently deleted campaign ${c.name}`, entityType: "campaign", entityId: id, brandId: c.brandId });
}
