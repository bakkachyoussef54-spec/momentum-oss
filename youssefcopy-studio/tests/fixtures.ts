import type { BrandProfile, ResearchItem } from "@/lib/types";

export function sleepMaskBrand(overrides: Partial<BrandProfile["product"]> = {}): BrandProfile {
  return {
    name: "Nocturne Labs",
    website: "https://example.com",
    instagramUrl: "",
    toneOfVoice: "Calm, reassuring, premium. No exclamation marks.",
    competitors: "Drugstore masks",
    restrictions: 'Never say "cure". Avoid "game-changer".',
    researchNotes: "",
    product: {
      name: "Nocturne Contour Mask",
      category: "Sleep accessories",
      description: "A contoured sleep mask with molded eye cups that block light without pressing on the eyes.",
      targetAudience: "Light-sensitive sleepers, shift workers and frequent travelers",
      painPoints: "Waking up at sunrise\nFlat masks press on the eyes",
      desires: "Fall asleep faster in a dark room",
      features: "Molded eye cups\nAdjustable strap",
      benefits: "Blocks light without pressure on the eyes\nStays in place for side sleepers",
      usp: "Contoured cups leave space for the eyes",
      testimonials: "",
      objections: "Masks feel uncomfortable\nIt will slip off",
      pricing: "$34. Free returns within 30 days.",
      ...overrides,
    },
  };
}

export const verifiedResearch: ResearchItem[] = [
  { id: "r1", title: "Spec sheet", url: "https://example.com/specs", category: "benefit", content: "Molded eye cups leave space for eyelashes.", status: "verified", flags: [] },
  { id: "r2", title: "Forum theme", url: "", category: "pain_point", content: "Side sleepers say masks shift.", status: "hypothesis", flags: [] },
];
