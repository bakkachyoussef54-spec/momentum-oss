import { analyzeEmail, type AnalysisResult } from "../analyzer";
import { db } from "../db";
import { parseStringArray } from "../json";
import { applyTemplate as fillTemplate } from "../templates/library";
import { emailContentSchema, emailMetaSchema, emailStatusSchema, type EmailContent } from "../validation";
import { emailContentOf, toBrandProfile, toResearchItem } from "./mappers";
import { logActivity } from "./settings";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export async function getEmail(id: string) {
  return db.campaignEmail.findUnique({
    where: { id },
    include: {
      campaign: {
        include: {
          brand: { include: { products: { take: 1, orderBy: { createdAt: "asc" } }, researchSources: { orderBy: { createdAt: "desc" } } } },
          emails: { orderBy: { position: "asc" }, select: { id: true, position: true, role: true, status: true, contentOrigin: true } },
        },
      },
      versions: { orderBy: { versionNumber: "desc" } },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

function hasContent(e: { body: string; hook: string; subjectLines: string; cta: string }) {
  return Boolean(e.body.trim() || e.hook.trim() || e.cta.trim() || parseStringArray(e.subjectLines).some((s) => s.trim()));
}

async function snapshot(tx: Tx, emailId: string, origin: string, label: string, aiModel = "") {
  const email = await tx.campaignEmail.findUniqueOrThrow({ where: { id: emailId } });
  const last = await tx.emailDraftVersion.findFirst({ where: { emailId }, orderBy: { versionNumber: "desc" } });
  return tx.emailDraftVersion.create({
    data: {
      emailId,
      versionNumber: (last?.versionNumber ?? 0) + 1,
      subjectLines: email.subjectLines,
      selectedSubject: email.selectedSubject,
      previewText: email.previewText,
      hook: email.hook,
      body: email.body,
      cta: email.cta,
      rationale: email.rationale,
      researchRefs: email.researchRefs,
      sections: email.sections,
      origin,
      label,
      aiModel,
    },
  });
}

function contentData(c: EmailContent) {
  return {
    subjectLines: JSON.stringify(c.subjectLines),
    selectedSubject: Math.min(c.selectedSubject, Math.max(0, c.subjectLines.length - 1)),
    previewText: c.previewText,
    hook: c.hook,
    body: c.body,
    cta: c.cta,
    rationale: c.rationale,
    researchRefs: JSON.stringify(c.researchRefs),
    sections: JSON.stringify(c.sections),
  };
}

async function bumpCampaignToDrafting(tx: Tx, campaignId: string) {
  await tx.campaign.updateMany({ where: { id: campaignId, status: "planning" }, data: { status: "drafting" } });
}

/** Autosave / manual save of the working draft. Human edits of AI copy are marked as such. */
/** Origin after a human save: AI stays "AI-assisted · edited"; using rule-based assists marks "guided". */
export function nextOrigin(current: string, assisted: boolean): string {
  if (current === "ai" || current === "ai_edited") return "ai_edited";
  if (assisted || current === "guided") return "guided";
  return "manual";
}

export async function saveDraft(emailId: string, raw: unknown, meta?: unknown, opts: { assisted?: boolean } = {}) {
  const content = emailContentSchema.parse(raw);
  const m = meta ? emailMetaSchema.partial().parse(meta) : {};
  return db.$transaction(async (tx) => {
    const current = await tx.campaignEmail.findUniqueOrThrow({ where: { id: emailId } });
    const origin = nextOrigin(current.contentOrigin, Boolean(opts.assisted));
    const updated = await tx.campaignEmail.update({ where: { id: emailId }, data: { ...contentData(content), ...m, contentOrigin: origin } });
    await bumpCampaignToDrafting(tx, current.campaignId);
    return updated;
  });
}

export async function createVersion(emailId: string, label: string) {
  const v = await db.$transaction((tx) => snapshot(tx, emailId, "manual", label.slice(0, 120) || "Manual save"));
  return v;
}

/** Restoring never loses work: the current draft is snapshotted first. */
export async function restoreVersion(emailId: string, versionId: string) {
  return db.$transaction(async (tx) => {
    const version = await tx.emailDraftVersion.findFirstOrThrow({ where: { id: versionId, emailId } });
    const current = await tx.campaignEmail.findUniqueOrThrow({ where: { id: emailId } });
    if (hasContent(current)) await snapshot(tx, emailId, current.contentOrigin === "empty" ? "manual" : current.contentOrigin, "Before restoring v" + version.versionNumber);
    const origin = ["ai", "ai_edited", "guided", "template"].includes(version.origin) ? version.origin : "manual";
    await tx.campaignEmail.update({
      where: { id: emailId },
      data: {
        subjectLines: version.subjectLines,
        selectedSubject: version.selectedSubject,
        previewText: version.previewText,
        hook: version.hook,
        body: version.body,
        cta: version.cta,
        rationale: version.rationale,
        researchRefs: version.researchRefs,
        sections: version.sections,
        contentOrigin: origin,
      },
    });
    return snapshot(tx, emailId, "restored", `Restored from v${version.versionNumber}`);
  });
}

/** Apply generated or template content, keeping the previous draft in history. */
export async function replaceContent(
  emailId: string,
  raw: unknown,
  opts: { origin: "ai" | "template" | "ai_edited"; label: string; aiModel?: string; meta?: unknown },
) {
  const content = emailContentSchema.parse(raw);
  const m = opts.meta ? emailMetaSchema.partial().parse(opts.meta) : {};
  return db.$transaction(async (tx) => {
    const current = await tx.campaignEmail.findUniqueOrThrow({ where: { id: emailId } });
    if (hasContent(current)) await snapshot(tx, emailId, current.contentOrigin === "empty" ? "manual" : current.contentOrigin, `Before: ${opts.label}`);
    await tx.campaignEmail.update({ where: { id: emailId }, data: { ...contentData(content), ...m, contentOrigin: opts.origin } });
    await bumpCampaignToDrafting(tx, current.campaignId);
    return snapshot(tx, emailId, opts.origin, opts.label, opts.aiModel ?? "");
  });
}

export async function applyTemplateToEmail(emailId: string, templateId: string) {
  const [email, template] = await Promise.all([
    db.campaignEmail.findUniqueOrThrow({ where: { id: emailId }, include: { campaign: { include: { brand: { include: { products: { take: 1, orderBy: { createdAt: "asc" } } } } } } } }),
    db.template.findUniqueOrThrow({ where: { id: templateId } }),
  ]);
  const filled = fillTemplate(
    {
      subjectLines: parseStringArray(template.subjectLines),
      previewText: template.previewText,
      hook: template.hook,
      body: template.body,
      cta: template.cta,
      framework: template.framework,
      goal: template.goal,
    },
    toBrandProfile(email.campaign.brand),
  );
  const v = await replaceContent(
    emailId,
    { ...filled, selectedSubject: 0, rationale: `Template “${template.name}” (${template.framework}): ${template.goal}`, researchRefs: [] },
    { origin: "template", label: `Applied template: ${template.name}`, meta: { framework: template.framework } },
  );
  await logActivity({ type: "template.applied", message: `Applied template ${template.name} to email ${email.position} of ${email.campaign.name}`, entityType: "email", entityId: emailId, brandId: email.campaign.brandId });
  return v;
}

export async function setEmailStatus(emailId: string, status: string) {
  const parsed = emailStatusSchema.parse(status);
  return db.$transaction(async (tx) => {
    const current = await tx.campaignEmail.findUniqueOrThrow({ where: { id: emailId }, include: { campaign: true } });
    let approvedVersionId = current.approvedVersionId;
    if (parsed === "approved") {
      if (!current.body.trim()) throw new Error("Cannot approve an email with an empty body");
      const v = await snapshot(tx, emailId, "approved", "Approved for delivery");
      approvedVersionId = v.id;
    }
    const updated = await tx.campaignEmail.update({ where: { id: emailId }, data: { status: parsed, approvedVersionId } });
    await tx.activityLog.create({
      data: {
        type: `email.${parsed}`,
        message: `Email ${current.position} of ${current.campaign.name} → ${parsed.replace("_", " ")}`,
        entityType: "email",
        entityId: emailId,
        brandId: current.campaign.brandId,
      },
    });
    return updated;
  });
}

export async function analyzeAndStore(emailId: string): Promise<AnalysisResult> {
  const email = await getEmail(emailId);
  if (!email) throw new Error("Email not found");
  const content = emailContentOf(email);
  const result = analyzeEmail(
    { ...content, segment: email.segment },
    toBrandProfile(email.campaign.brand),
    email.campaign.brand.researchSources.map(toResearchItem),
  );
  await db.copywritingAnalysis.create({
    data: {
      emailId,
      totalScore: result.totalScore,
      breakdown: JSON.stringify(result.breakdown),
      flags: JSON.stringify(result.flags),
      improvements: JSON.stringify(result.improvements),
      method: "heuristic",
    },
  });
  return result;
}

/** True if the working draft differs from the approved snapshot. */
export function editedSinceApproval(
  email: { subjectLines: string; previewText: string; hook: string; body: string; cta: string; selectedSubject: number },
  approved: { subjectLines: string; previewText: string; hook: string; body: string; cta: string; selectedSubject: number } | null,
) {
  if (!approved) return false;
  return (
    email.subjectLines !== approved.subjectLines ||
    email.previewText !== approved.previewText ||
    email.hook !== approved.hook ||
    email.body !== approved.body ||
    email.cta !== approved.cta ||
    email.selectedSubject !== approved.selectedSubject
  );
}
