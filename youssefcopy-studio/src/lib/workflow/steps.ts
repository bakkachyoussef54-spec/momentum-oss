import type { Readiness } from "../research/validate";

export type StepStatus = "complete" | "in_progress" | "todo";

export interface WorkflowStep {
  key: string;
  label: string;
  status: StepStatus;
  href: string;
  detail: string;
}

export interface WorkflowInput {
  brand: { id: string; requiredMissing: number; readiness: Readiness; researchCount: number; verifiedCount: number } | null;
  campaign: {
    id: string;
    emails: { id: string; position: number; status: string; contentOrigin: string; complete: boolean; updatedAt: Date }[];
    lastExportAt: Date | null;
  } | null;
}

export interface PackageEmailCheck {
  position: number;
  checks: { label: string; ok: boolean }[];
}

/** Review checks for one email in the client package. */
export function emailPackageChecks(e: {
  position: number;
  subjectLines: string[];
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  rationale: string;
  researchRefs: string[];
  approved: boolean;
  editedSinceApproval?: boolean;
}): PackageEmailCheck {
  return {
    position: e.position,
    checks: [
      { label: "Three subject line options", ok: e.subjectLines.filter((s) => s.trim()).length >= 3 },
      { label: "Preview text", ok: Boolean(e.previewText.trim()) },
      { label: "Opening hook and body", ok: Boolean(e.hook.trim() && e.body.trim()) },
      { label: "Primary CTA", ok: Boolean(e.cta.trim()) },
      { label: "Strategic rationale", ok: Boolean(e.rationale.trim()) },
      { label: "Research references", ok: e.researchRefs.length > 0 },
      { label: e.editedSinceApproval ? "Approved (edited since — re-approve)" : "Approved", ok: e.approved && !e.editedSinceApproval },
    ],
  };
}

/**
 * Brand Profile → Research → Campaign → Email 1..n → Review → Export.
 * Every step stays clickable so users can go back without losing work.
 */
export function computeWorkflow(input: WorkflowInput): WorkflowStep[] {
  const { brand, campaign } = input;
  const steps: WorkflowStep[] = [];
  steps.push({
    key: "brand",
    label: "Brand Profile",
    status: !brand ? "todo" : brand.requiredMissing === 0 ? "complete" : "in_progress",
    href: brand ? `/brands/${brand.id}` : "/brands/new",
    detail: !brand ? "Create the client profile" : brand.requiredMissing === 0 ? "Required details entered" : `${brand.requiredMissing} required detail(s) missing`,
  });
  steps.push({
    key: "research",
    label: "Research",
    status: !brand ? "todo" : brand.verifiedCount > 0 && brand.readiness === "ready" ? "complete" : brand.researchCount > 0 || brand.readiness !== "insufficient" ? "in_progress" : "todo",
    href: brand ? `/research?brand=${brand.id}` : "/research",
    detail: brand ? `${brand.verifiedCount} verified of ${brand.researchCount} item(s)` : "Add sources and mark verified facts",
  });
  steps.push({
    key: "campaign",
    label: "Campaign",
    status: campaign ? "complete" : "todo",
    href: campaign ? `/campaigns/${campaign.id}` : brand ? `/brands/${brand.id}#plan` : "/campaigns/new",
    detail: campaign ? `${campaign.emails.length}-email plan ready` : "Plan the three-email sequence",
  });
  const emails = campaign?.emails ?? [{ id: "", position: 1 }, { id: "", position: 2 }, { id: "", position: 3 }].map((e) => ({ ...e, status: "draft", contentOrigin: "empty", complete: false, updatedAt: new Date(0) }));
  for (const e of [...emails].sort((a, b) => a.position - b.position)) {
    steps.push({
      key: `email-${e.position}`,
      label: `Email ${e.position}`,
      status: e.status === "approved" ? "complete" : e.contentOrigin !== "empty" ? "in_progress" : "todo",
      href: e.id ? `/editor/${e.id}` : steps[2].href,
      detail: e.status === "approved" ? "Approved" : e.contentOrigin !== "empty" ? (e.complete ? "Written — awaiting approval" : "Drafting") : "Not started",
    });
  }
  const allReady = Boolean(campaign && campaign.emails.length && campaign.emails.every((e) => e.status === "approved" && e.complete));
  const anyApproved = Boolean(campaign?.emails.some((e) => e.status === "approved"));
  steps.push({
    key: "review",
    label: "Review",
    status: allReady ? "complete" : anyApproved ? "in_progress" : "todo",
    href: campaign ? `/delivery?campaign=${campaign.id}#review` : "/delivery",
    detail: allReady ? "Every email approved and complete" : "Approve every email and pass the checklist",
  });
  const lastEdit = campaign ? Math.max(0, ...campaign.emails.map((e) => e.updatedAt.getTime())) : 0;
  const exported = campaign?.lastExportAt ?? null;
  steps.push({
    key: "export",
    label: "Export",
    status: exported && exported.getTime() >= lastEdit ? "complete" : exported ? "in_progress" : "todo",
    href: campaign ? `/delivery?campaign=${campaign.id}#export` : "/delivery",
    detail: exported ? (exported.getTime() >= lastEdit ? "Exported (up to date)" : "Edited since last export — export again") : "Download DOCX, Markdown or text",
  });
  return steps;
}
