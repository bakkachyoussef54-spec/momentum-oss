/**
 * Plain profile shapes used by pure logic (validation, strategy, analyzer, export).
 * Kept independent from Prisma types so these modules are trivially unit-testable.
 */
export interface ProductProfile {
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
}

export interface BrandProfile {
  name: string;
  website: string;
  instagramUrl: string;
  toneOfVoice: string;
  competitors: string;
  restrictions: string;
  researchNotes: string;
  product: ProductProfile;
}

export interface ResearchItem {
  id: string;
  title: string;
  url: string;
  category: string;
  content: string;
  status: string;
  flags: string[];
}

export const EMPTY_PRODUCT: ProductProfile = {
  name: "",
  category: "",
  description: "",
  targetAudience: "",
  painPoints: "",
  desires: "",
  features: "",
  benefits: "",
  usp: "",
  testimonials: "",
  objections: "",
  pricing: "",
  links: "",
};
