import { detectPromptInjection } from "../compliance";
import { splitList } from "../json";
import type { BrandProfile, ResearchItem } from "../types";
import { validateResearch, type ResearchValidation } from "./validate";

export type BriefBucket = "pain_point" | "desire" | "benefit" | "objection" | "testimonial" | "other";

export interface EvidenceRef {
  title: string;
  url: string;
  status: string;
  category: string;
}

export interface SortedNote {
  text: string;
  source: string;
}

export interface StructuredBrief {
  identity: { brand: string; website: string; instagram: string; category: string };
  product: { name: string; description: string; features: string[]; usp: string; pricing: string };
  audience: string;
  painPoints: string[];
  desires: string[];
  benefits: { verified: string[]; unconfirmed: string[] };
  objections: string[];
  voice: { tone: string; restrictions: string[] };
  evidence: { verified: EvidenceRef[]; hypotheses: EvidenceRef[]; unreviewed: EvidenceRef[] };
  links: string[];
  /** Lines from unreviewed/general research, sorted by keyword rules. Never treated as facts. */
  autoSorted: Record<Exclude<BriefBucket, "other">, SortedNote[]>;
  validation: ResearchValidation;
  completeness: { section: string; done: boolean }[];
}

const RULES: { bucket: Exclude<BriefBucket, "other">; pattern: RegExp }[] = [
  { bucket: "testimonial", pattern: /(★|\b\d(\.\d)? ?\/ ?5\b|\bstars?\b|\breview(ed)?\b|^["“].{8,}["”]|\b(i|we) (love|bought|tried|use)\b)/i },
  { bucket: "objection", pattern: /\b(too expensive|expensive|price|worth it|not sure|unsure|worried|skeptic|doubt|won'?t work|doesn'?t work|hesitat|what if|concern)/i },
  { bucket: "pain_point", pattern: /\b(struggl|can'?t|cannot|hate|annoy|frustrat|problem|tired|exhaust|wak(e|ing) up|uncomfortable|pain|hurts?|keeps? (me|them)|trouble|difficult)/i },
  { bucket: "desire", pattern: /\b(want|wish|dream|hope|would love|looking for|goal|finally|i'?d like)/i },
  { bucket: "benefit", pattern: /\b(helps?|so (you|they) can|reduces?|improves?|blocks?|prevents? light|keeps? .{0,20} in place|easier|without)/i },
];

/** Deterministically assign one line of research to a bucket by keyword rules (first match wins). */
export function classifyLine(line: string): BriefBucket {
  for (const r of RULES) if (r.pattern.test(line)) return r.bucket;
  return "other";
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z“"])/)
    .map((l) => l.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length >= 8 && l.length <= 400);
}

const dedupe = (items: string[]) => Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));

/**
 * Feature 1 — organize the profile and stored research into a structured brief.
 * Pure and rule-based: it only rearranges what the user entered and never adds facts.
 */
export function buildStructuredBrief(brand: BrandProfile, research: ResearchItem[]): StructuredBrief {
  const p = brand.product;
  const verified = research.filter((r) => r.status === "verified");
  const ofCat = (items: ResearchItem[], cat: string) => items.filter((r) => r.category === cat && r.content.trim()).map((r) => r.content.trim());
  const ref = (r: ResearchItem): EvidenceRef => ({ title: r.title, url: r.url, status: r.status, category: r.category });

  const autoSorted: StructuredBrief["autoSorted"] = { pain_point: [], desire: [], benefit: [], objection: [], testimonial: [] };
  for (const r of research) {
    if (r.status === "verified" && r.category !== "general") continue;
    for (const line of lines(r.content)) {
      if (detectPromptInjection(line)) continue;
      const bucket = classifyLine(line);
      if (bucket !== "other" && autoSorted[bucket].length < 12) autoSorted[bucket].push({ text: line, source: r.title });
    }
  }

  const links = dedupe([brand.website, brand.instagramUrl, ...splitList(p.links), ...research.map((r) => r.url)]).filter((u) => /^https?:\/\//i.test(u));

  const brief: Omit<StructuredBrief, "completeness"> = {
    identity: { brand: brand.name, website: brand.website, instagram: brand.instagramUrl, category: p.category },
    product: { name: p.name, description: p.description, features: splitList(p.features), usp: p.usp, pricing: p.pricing },
    audience: p.targetAudience,
    painPoints: dedupe([...splitList(p.painPoints), ...ofCat(verified, "pain_point")]),
    desires: dedupe([...splitList(p.desires), ...ofCat(verified, "desire")]),
    benefits: {
      verified: dedupe([...splitList(p.benefits), ...ofCat(verified, "benefit")]),
      unconfirmed: dedupe(ofCat(research.filter((r) => r.status !== "verified"), "benefit")),
    },
    objections: dedupe([...splitList(p.objections), ...ofCat(verified, "objection")]),
    voice: { tone: brand.toneOfVoice, restrictions: splitList(brand.restrictions) },
    evidence: {
      verified: verified.map(ref),
      hypotheses: research.filter((r) => r.status === "hypothesis").map(ref),
      unreviewed: research.filter((r) => r.status === "unreviewed").map(ref),
    },
    links,
    autoSorted,
    validation: validateResearch(brand, research),
  };

  const completeness = [
    { section: "Brand identity", done: Boolean(brand.name.trim() && (brand.website.trim() || p.category.trim())) },
    { section: "Product information", done: Boolean(p.name.trim() && p.description.trim()) },
    { section: "Target audience", done: Boolean(p.targetAudience.trim()) },
    { section: "Pain points", done: brief.painPoints.length > 0 },
    { section: "Desires", done: brief.desires.length > 0 },
    { section: "Verified benefits", done: brief.benefits.verified.length > 0 },
    { section: "Purchase objections", done: brief.objections.length > 0 },
    { section: "Brand voice", done: Boolean(brand.toneOfVoice.trim()) },
    { section: "Research evidence", done: verified.length > 0 },
    { section: "Product links", done: links.length > 0 },
  ];
  return { ...brief, completeness };
}
