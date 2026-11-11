import { findHealthClaims, type ClaimFinding } from "../compliance";
import { splitList } from "../json";
import type { BrandProfile, ResearchItem } from "../types";

export type Readiness = "ready" | "partial" | "insufficient";

export interface MissingField {
  field: string;
  label: string;
  severity: "required" | "recommended";
  why: string;
}

export interface ResearchValidation {
  readiness: Readiness;
  missing: MissingField[];
  warnings: string[];
  counts: { verified: number; hypothesis: number; unreviewed: number; flagged: number };
  healthClaimRisks: (ClaimFinding & { field: string })[];
  verifiedTestimonials: number;
}

const REQUIRED: { field: keyof BrandProfile["product"]; label: string; why: string }[] = [
  { field: "description", label: "Product description", why: "Emails cannot describe the product accurately without it." },
  { field: "targetAudience", label: "Target audience", why: "Copy needs a specific reader to be relevant." },
  { field: "benefits", label: "Verified benefits", why: "Benefit claims must come from the client, not be invented." },
  { field: "painPoints", label: "Customer pain points", why: "Each email should solve one real customer problem." },
];

const RECOMMENDED: { field: keyof BrandProfile["product"]; label: string; why: string }[] = [
  { field: "objections", label: "Purchase objections", why: "Needed for objection-handling emails." },
  { field: "usp", label: "Unique selling proposition", why: "Helps differentiate from competitors." },
  { field: "desires", label: "Customer desires", why: "Gives each email a believable promise." },
  { field: "features", label: "Product features", why: "Specific features make copy concrete." },
];

/**
 * Stage A — Research Validation.
 * Checks whether there is enough client-provided evidence to write without inventing facts.
 */
export function validateResearch(
  brand: BrandProfile,
  research: ResearchItem[],
  options: { campaignType?: string } = {},
): ResearchValidation {
  const missing: MissingField[] = [];
  const warnings: string[] = [];
  const p = brand.product;

  const verified = research.filter((r) => r.status === "verified");
  const hasVerified = (category: string) => verified.some((r) => r.category === category && r.content.trim());

  for (const r of REQUIRED) {
    const filled = p[r.field].trim().length > 0;
    const backed = r.field === "benefits" && hasVerified("benefit");
    if (!filled && !backed) missing.push({ field: r.field, label: r.label, severity: "required", why: r.why });
  }
  for (const r of RECOMMENDED) {
    if (!p[r.field].trim()) missing.push({ field: r.field, label: r.label, severity: "recommended", why: r.why });
  }
  if (!brand.toneOfVoice.trim()) {
    missing.push({ field: "toneOfVoice", label: "Brand tone of voice", severity: "recommended", why: "Keeps drafts on-brand." });
  }
  const isPromo = options.campaignType === "promotional" || options.campaignType === "abandoned_cart";
  if (isPromo && !p.pricing.trim() && !hasVerified("pricing")) {
    missing.push({
      field: "pricing",
      label: "Pricing & promotional details",
      severity: "required",
      why: "Promotional emails must not invent discounts or deadlines.",
    });
  }

  const verifiedTestimonials = verified.filter((r) => r.category === "testimonial").length;
  if (p.testimonials.trim() && verifiedTestimonials === 0) {
    warnings.push(
      "Testimonials are entered on the profile but none are marked as verified research. Confirm they are real, attributable customer reviews before quoting them.",
    );
  }
  if (!p.testimonials.trim() && verifiedTestimonials === 0) {
    warnings.push("No testimonials or reviews available — drafts will avoid social proof rather than invent it.");
  }

  const sourcesWithUrl = research.filter((r) => r.url.trim()).length;
  if (research.length === 0) warnings.push("No research sources stored yet. Add source notes or URLs so claims can be traced.");
  else if (sourcesWithUrl === 0) warnings.push("None of the research items include a source URL.");

  const hypothesis = research.filter((r) => r.status === "hypothesis").length;
  const unreviewed = research.filter((r) => r.status === "unreviewed").length;
  const flagged = research.filter((r) => r.flags.length > 0).length;
  if (unreviewed > 0) warnings.push(`${unreviewed} research item(s) are unreviewed and will be treated as hypotheses, not facts.`);
  if (flagged > 0) warnings.push(`${flagged} research item(s) contain text that looks like instructions to an AI system; those lines are withheld from prompts.`);

  const healthClaimRisks: ResearchValidation["healthClaimRisks"] = [];
  const scan: [string, string][] = [
    ["Product description", p.description],
    ["Benefits", p.benefits],
    ["USP", p.usp],
    ["Features", p.features],
    ["Testimonials", p.testimonials],
  ];
  for (const [field, value] of scan) {
    for (const f of findHealthClaims(value)) healthClaimRisks.push({ ...f, field });
  }
  if (healthClaimRisks.length) {
    warnings.push("Some profile text contains medical-style claims. Confirm documented evidence or rephrase before using them in emails.");
  }

  const requiredMissing = missing.filter((m) => m.severity === "required").length;
  const readiness: Readiness =
    requiredMissing >= 2 ? "insufficient" : requiredMissing === 1 || missing.length > 3 ? "partial" : "ready";

  return {
    readiness,
    missing,
    warnings,
    counts: { verified: verified.length, hypothesis, unreviewed, flagged },
    healthClaimRisks,
    verifiedTestimonials,
  };
}

export interface CustomerPsychology {
  primaryProblem: string;
  primaryDesire: string;
  topObjection: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  benefits: string[];
  proofAvailable: boolean;
}

/** Stage B — Customer Psychology Analysis (deterministic extraction from client research). */
export function analyzePsychology(brand: BrandProfile, research: ResearchItem[]): CustomerPsychology {
  const p = brand.product;
  const verifiedOf = (category: string) =>
    research.filter((r) => r.status === "verified" && r.category === category).map((r) => r.content.trim()).filter(Boolean);

  const painPoints = [...splitList(p.painPoints), ...verifiedOf("pain_point")];
  const desires = [...splitList(p.desires), ...verifiedOf("desire")];
  const objections = [...splitList(p.objections), ...verifiedOf("objection")];
  const benefits = [...splitList(p.benefits), ...verifiedOf("benefit")];

  return {
    primaryProblem: painPoints[0] ?? "",
    primaryDesire: desires[0] ?? "",
    topObjection: objections[0] ?? "",
    painPoints,
    desires,
    objections,
    benefits,
    proofAvailable: verifiedOf("testimonial").length > 0,
  };
}
