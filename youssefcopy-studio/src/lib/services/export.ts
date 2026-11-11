import { db } from "../db";
import { parseStringArray, splitList } from "../json";
import { parseBrief } from "./campaigns";
import { editedSinceApproval } from "./emails";
import type { ClientPackage } from "../export/package";

/** Assemble the client package from approved snapshots (or flagged working drafts). */
export async function buildClientPackage(campaignId: string): Promise<ClientPackage> {
  const c = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      brand: { include: { researchSources: { where: { status: "verified" }, orderBy: { createdAt: "asc" } } } },
      emails: { orderBy: { position: "asc" } },
    },
  });
  if (!c) throw new Error("Campaign not found");
  const approvedIds = c.emails.map((e) => e.approvedVersionId).filter((x): x is string => Boolean(x));
  const approvedVersions = await db.emailDraftVersion.findMany({ where: { id: { in: approvedIds } } });
  const byId = new Map(approvedVersions.map((v) => [v.id, v]));
  const brief = parseBrief(c.brief);

  const emails = c.emails.map((e) => {
    const approved = e.status === "approved" && e.approvedVersionId ? byId.get(e.approvedVersionId) ?? null : null;
    const src = approved ?? e;
    return {
      position: e.position,
      role: e.role,
      objective: e.objective,
      framework: e.framework,
      segment: e.segment,
      subjectLines: parseStringArray(src.subjectLines),
      selectedSubject: src.selectedSubject,
      previewText: src.previewText,
      hook: src.hook,
      body: src.body,
      cta: src.cta,
      rationale: src.rationale,
      researchRefs: parseStringArray(src.researchRefs),
      approved: Boolean(approved),
      editedSinceApproval: approved ? editedSinceApproval(e, approved) : false,
      origin: approved ? approved.origin : e.contentOrigin,
    };
  });

  const researchNotes = [
    ...c.brand.researchSources.map((r) => `${r.title}${r.url ? ` (${r.url})` : ""}: ${r.content.slice(0, 400)}`),
    ...splitList(c.brand.researchNotes).slice(0, 10),
  ];

  return {
    brandName: c.brand.name,
    campaignName: c.name,
    campaignType: c.type,
    objective: c.goal,
    audience: c.audience,
    tone: c.tone,
    strategy: brief?.strategy ?? "",
    emails,
    researchNotes,
    generatedAt: new Date().toISOString(),
  };
}
