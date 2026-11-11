import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { CAMPAIGN_TYPE_LABELS, type CampaignType } from "../constants";
import { humanReviewRecommendations, type ClientPackage } from "./package";

const BRAND_BLUE = "0057FF";

function labelValue(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value || "—")],
  });
}

function multiline(text: string) {
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map(
      (para) =>
        new Paragraph({
          spacing: { after: 160 },
          children: para.split("\n").flatMap((line, i) => (i === 0 ? [new TextRun(line)] : [new TextRun({ text: line, break: 1 })])),
        }),
    );
}

function bullets(items: string[]) {
  return items.map((t) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 60 } }));
}

export async function toDocx(pkg: ClientPackage): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: "YOUSSEFCOPY STUDIO · CLIENT PACKAGE", color: BRAND_BLUE, bold: true, size: 18 })],
      spacing: { after: 120 },
    }),
    new Paragraph({ text: `${pkg.brandName} — ${pkg.campaignName}`, heading: HeadingLevel.TITLE }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: new Date(pkg.generatedAt).toLocaleDateString("en-US", { dateStyle: "long" }), italics: true, color: "666666" })],
      spacing: { after: 240 },
    }),
    new Paragraph({ text: "Campaign overview", heading: HeadingLevel.HEADING_1 }),
    labelValue("Brand", pkg.brandName),
    labelValue("Campaign type", CAMPAIGN_TYPE_LABELS[pkg.campaignType as CampaignType] ?? pkg.campaignType),
    labelValue("Objective", pkg.objective),
    labelValue("Target audience", pkg.audience),
    labelValue("Tone of voice", pkg.tone),
    new Paragraph({ text: "Campaign strategy", heading: HeadingLevel.HEADING_1 }),
    ...multiline(pkg.strategy || "—"),
  ];

  for (const e of pkg.emails) {
    const subject = e.subjectLines[e.selectedSubject] ?? e.subjectLines[0] ?? "";
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        children: [new TextRun(`Email ${e.position} — ${e.role || "Untitled"}`), ...(e.approved ? [] : [new TextRun({ text: "  (DRAFT — not yet approved)", color: "B54708" })])],
      }),
      labelValue("Objective", e.objective),
      labelValue("Framework", e.framework),
      labelValue("Recommended segment", e.segment),
      labelValue("Subject line", subject),
    );
    const alts = e.subjectLines.filter((s, i) => i !== e.selectedSubject && s);
    if (alts.length) {
      children.push(new Paragraph({ children: [new TextRun({ text: "Subject line alternatives", bold: true })] }), ...bullets(alts));
    }
    children.push(
      labelValue("Preview text", e.previewText),
      new Paragraph({
        text: "Email copy",
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "EAEAEA", space: 4 } },
      }),
      ...(e.hook ? multiline(e.hook) : []),
      ...multiline(e.body || "—"),
      labelValue("CTA", e.cta),
    );
    if (e.rationale) children.push(new Paragraph({ text: "Copywriting rationale", heading: HeadingLevel.HEADING_3 }), ...multiline(e.rationale));
    if (e.researchRefs.length) children.push(new Paragraph({ text: "Research references", heading: HeadingLevel.HEADING_3 }), ...bullets(e.researchRefs));
  }

  if (pkg.researchNotes.length) {
    children.push(new Paragraph({ text: "Supporting research notes", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }), ...bullets(pkg.researchNotes));
  }
  children.push(new Paragraph({ text: "Recommendations for human review", heading: HeadingLevel.HEADING_1 }), ...bullets(humanReviewRecommendations(pkg)));

  const doc = new Document({
    creator: "YoussefCopy Studio",
    title: `${pkg.brandName} — ${pkg.campaignName}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
