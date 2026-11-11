import { parseJson, parseStringArray } from "../json";
import { emailSectionsSchema, type EmailSections } from "../validation";

const EMPTY_SECTIONS: EmailSections = { problem: "", benefit: "", transition: "" };

export function parseSections(raw: string | undefined): EmailSections {
  return parseJson(raw, emailSectionsSchema, EMPTY_SECTIONS);
}
import { EMPTY_PRODUCT, type BrandProfile, type ResearchItem } from "../types";

interface BrandRow {
  name: string;
  website: string;
  instagramUrl: string;
  toneOfVoice: string;
  competitors: string;
  restrictions: string;
  researchNotes: string;
  products?: {
    name: string;
    category: string;
    description: string;
    targetAudience: string;
    painPoints: string;
    desires: string;
    features: string;
    benefits: string;
    usp: string;
    testimonials: string;
    objections: string;
    pricing: string;
    links: string;
  }[];
}

export function toBrandProfile(brand: BrandRow): BrandProfile {
  const p = brand.products?.[0];
  return {
    name: brand.name,
    website: brand.website,
    instagramUrl: brand.instagramUrl,
    toneOfVoice: brand.toneOfVoice,
    competitors: brand.competitors,
    restrictions: brand.restrictions,
    researchNotes: brand.researchNotes,
    product: p
      ? {
          name: p.name,
          category: p.category,
          description: p.description,
          targetAudience: p.targetAudience,
          painPoints: p.painPoints,
          desires: p.desires,
          features: p.features,
          benefits: p.benefits,
          usp: p.usp,
          testimonials: p.testimonials,
          objections: p.objections,
          pricing: p.pricing,
          links: p.links,
        }
      : { ...EMPTY_PRODUCT },
  };
}

export function toResearchItem(r: { id: string; title: string; url: string; category: string; content: string; status: string; flags: string }): ResearchItem {
  return { id: r.id, title: r.title, url: r.url, category: r.category, content: r.content, status: r.status, flags: parseStringArray(r.flags) };
}

export function emailContentOf(e: {
  subjectLines: string;
  selectedSubject: number;
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  rationale: string;
  researchRefs: string;
  sections?: string;
}) {
  return {
    subjectLines: parseStringArray(e.subjectLines),
    selectedSubject: e.selectedSubject,
    previewText: e.previewText,
    hook: e.hook,
    body: e.body,
    cta: e.cta,
    rationale: e.rationale,
    researchRefs: parseStringArray(e.researchRefs),
    sections: parseSections(e.sections),
  };
}
