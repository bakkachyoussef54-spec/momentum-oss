import { CAMPAIGN_TYPE_LABELS, type CampaignType } from "../constants";

export interface PackageEmail {
  position: number;
  role: string;
  objective: string;
  framework: string;
  segment: string;
  subjectLines: string[];
  selectedSubject: number;
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  rationale: string;
  researchRefs: string[];
  approved: boolean;
  /** True when the working draft changed after the approved snapshot was taken. */
  editedSinceApproval: boolean;
  origin: string;
}

export interface ClientPackage {
  brandName: string;
  campaignName: string;
  campaignType: string;
  objective: string;
  audience: string;
  tone: string;
  strategy: string;
  emails: PackageEmail[];
  researchNotes: string[];
  generatedAt: string;
}

export function humanReviewRecommendations(pkg: ClientPackage): string[] {
  const recs = [
    "Verify every product claim, number and benefit against the client's own documentation before sending.",
    "Confirm any discount, deadline, shipping or return policy mentioned is current and approved by the client.",
    "Check health-related wording: no disease-treatment promises, invented medical evidence or unverified endorsements.",
    "Confirm testimonials are real, attributable and used with permission.",
    "Send test emails to check rendering, links, personalization fallbacks and the unsubscribe footer.",
    "Quality scores in this studio are heuristic editorial guidance — not predictions of open, click or conversion rates.",
  ];
  const unapproved = pkg.emails.filter((e) => !e.approved).length;
  if (unapproved) recs.unshift(`${unapproved} email(s) are not yet approved and are included as working drafts — review them before delivery.`);
  const edited = pkg.emails.filter((e) => e.editedSinceApproval).length;
  if (edited) recs.unshift(`${edited} email(s) were edited after approval; the package contains the approved version, not the later edits.`);
  return recs;
}

function typeLabel(type: string) {
  return CAMPAIGN_TYPE_LABELS[type as CampaignType] ?? type;
}

export function toMarkdown(pkg: ClientPackage): string {
  const lines: string[] = [];
  lines.push(`# ${pkg.brandName} — ${pkg.campaignName}`, "");
  lines.push(`*Prepared by YoussefCopy Studio · ${new Date(pkg.generatedAt).toLocaleDateString("en-US", { dateStyle: "long" })}*`, "");
  lines.push("## Campaign overview", "");
  lines.push(`- **Brand:** ${pkg.brandName}`);
  lines.push(`- **Campaign type:** ${typeLabel(pkg.campaignType)}`);
  lines.push(`- **Objective:** ${pkg.objective || "—"}`);
  lines.push(`- **Target audience:** ${pkg.audience || "—"}`);
  lines.push(`- **Tone of voice:** ${pkg.tone || "—"}`, "");
  lines.push("## Campaign strategy", "", pkg.strategy || "—", "");
  for (const e of pkg.emails) {
    const subject = e.subjectLines[e.selectedSubject] ?? e.subjectLines[0] ?? "";
    lines.push(`## Email ${e.position} — ${e.role || "Untitled"}${e.approved ? "" : " (DRAFT — not yet approved)"}`, "");
    lines.push(`**Objective:** ${e.objective || "—"}  `);
    lines.push(`**Framework:** ${e.framework || "—"}  `);
    lines.push(`**Recommended segment:** ${e.segment || "—"}`, "");
    lines.push(`**Subject line:** ${subject || "—"}`, "");
    const alts = e.subjectLines.filter((_, i) => i !== e.selectedSubject && e.subjectLines[i]);
    if (alts.length) {
      lines.push("**Alternatives:**");
      for (const a of alts) lines.push(`- ${a}`);
      lines.push("");
    }
    lines.push(`**Preview text:** ${e.previewText || "—"}`, "");
    lines.push("**Email copy:**", "");
    if (e.hook) lines.push(e.hook, "");
    lines.push(e.body || "—", "");
    lines.push(`**CTA:** ${e.cta || "—"}`, "");
    if (e.rationale) lines.push(`**Copywriting rationale:** ${e.rationale}`, "");
    if (e.researchRefs.length) {
      lines.push("**Research references:**");
      for (const r of e.researchRefs) lines.push(`- ${r}`);
      lines.push("");
    }
    lines.push("---", "");
  }
  if (pkg.researchNotes.length) {
    lines.push("## Supporting research notes", "");
    for (const n of pkg.researchNotes) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push("## Recommendations for human review", "");
  for (const r of humanReviewRecommendations(pkg)) lines.push(`- ${r}`);
  lines.push("");
  return lines.join("\n");
}

export function toPlainText(pkg: ClientPackage): string {
  const rule = "=".repeat(60);
  const lines: string[] = [];
  lines.push(`${pkg.brandName.toUpperCase()} — ${pkg.campaignName}`, rule, "");
  lines.push(`Campaign type: ${typeLabel(pkg.campaignType)}`);
  lines.push(`Objective: ${pkg.objective || "-"}`);
  lines.push(`Target audience: ${pkg.audience || "-"}`);
  lines.push(`Tone of voice: ${pkg.tone || "-"}`, "");
  lines.push("CAMPAIGN STRATEGY", pkg.strategy || "-", "");
  for (const e of pkg.emails) {
    const subject = e.subjectLines[e.selectedSubject] ?? e.subjectLines[0] ?? "";
    lines.push(rule, `EMAIL ${e.position}: ${e.role || "Untitled"}${e.approved ? "" : " (DRAFT - not yet approved)"}`, rule);
    lines.push(`Objective: ${e.objective || "-"}`);
    lines.push(`Framework: ${e.framework || "-"}`);
    lines.push(`Segment: ${e.segment || "-"}`, "");
    lines.push(`Subject: ${subject || "-"}`);
    e.subjectLines.forEach((s, i) => {
      if (i !== e.selectedSubject && s) lines.push(`  Alternative: ${s}`);
    });
    lines.push(`Preview text: ${e.previewText || "-"}`, "");
    if (e.hook) lines.push(e.hook, "");
    lines.push(e.body || "-", "");
    lines.push(`CTA: ${e.cta || "-"}`, "");
    if (e.rationale) lines.push(`Rationale: ${e.rationale}`, "");
    if (e.researchRefs.length) lines.push("Research references:", ...e.researchRefs.map((r) => `  - ${r}`), "");
  }
  if (pkg.researchNotes.length) lines.push(rule, "SUPPORTING RESEARCH NOTES", ...pkg.researchNotes.map((n) => `- ${n}`), "");
  lines.push(rule, "RECOMMENDATIONS FOR HUMAN REVIEW", ...humanReviewRecommendations(pkg).map((r) => `- ${r}`), "");
  return lines.join("\n");
}

export function exportFileName(pkg: ClientPackage, ext: string): string {
  const slug = `${pkg.brandName}-${pkg.campaignName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${slug || "campaign"}-client-package.${ext}`;
}
