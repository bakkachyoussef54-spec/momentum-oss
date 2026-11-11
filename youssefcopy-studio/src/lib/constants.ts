export const CAMPAIGN_TYPES = [
  "welcome",
  "abandoned_cart",
  "post_purchase",
  "product_launch",
  "promotional",
  "win_back",
  "educational",
  "re_engagement",
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  welcome: "Welcome Series",
  abandoned_cart: "Abandoned Cart Series",
  post_purchase: "Post-Purchase Series",
  product_launch: "Product Launch",
  promotional: "Promotional Campaign",
  win_back: "Win-back Campaign",
  educational: "Educational Email",
  re_engagement: "Re-engagement Campaign",
};

export const CAMPAIGN_STATUSES = ["planning", "drafting", "review", "completed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  planning: "Planning",
  drafting: "Drafting",
  review: "In review",
  completed: "Completed",
};

export const EMAIL_STATUSES = ["draft", "in_review", "approved"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];
export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  draft: "Draft",
  in_review: "Awaiting review",
  approved: "Approved",
};

export const FRAMEWORKS = ["AIDA", "PAS", "BAB", "4Ps", "Benefit-Led", "Story-Based"] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const FRAMEWORK_DESCRIPTIONS: Record<Framework, string> = {
  AIDA: "Attention → Interest → Desire → Action. Good for introductions and launches.",
  PAS: "Problem → Agitate → Solution. Good for objection handling and pain-led emails.",
  BAB: "Before → After → Bridge. Good for transformation and win-back stories.",
  "4Ps": "Promise → Picture → Proof → Push. Good for offers backed by verified proof.",
  "Benefit-Led": "Lead with the single most relevant benefit, then support it.",
  "Story-Based": "A short, specific story that carries one idea to a natural CTA.",
};

export const TONES = [
  "Warm & reassuring",
  "Calm & premium",
  "Friendly & conversational",
  "Confident & direct",
  "Playful & witty",
  "Expert & educational",
] as const;

export const CONTENT_ORIGIN_LABELS: Record<string, string> = {
  empty: "Empty",
  manual: "Human-written",
  template: "From template",
  ai: "AI draft",
  ai_edited: "AI draft · human-edited",
  restored: "Restored version",
  approved: "Approved snapshot",
};

export const RESEARCH_STATUSES = ["verified", "hypothesis", "unreviewed"] as const;
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];
export const RESEARCH_STATUS_LABELS: Record<ResearchStatus, string> = {
  verified: "Verified fact",
  hypothesis: "Hypothesis",
  unreviewed: "Unreviewed",
};

export const RESEARCH_CATEGORIES = [
  "general",
  "benefit",
  "pain_point",
  "desire",
  "objection",
  "testimonial",
  "claim",
  "competitor",
  "pricing",
] as const;
export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number];
export const RESEARCH_CATEGORY_LABELS: Record<ResearchCategory, string> = {
  general: "General note",
  benefit: "Benefit",
  pain_point: "Pain point",
  desire: "Desire",
  objection: "Objection",
  testimonial: "Testimonial / review",
  claim: "Product claim",
  competitor: "Competitor",
  pricing: "Pricing / promo",
};

export const RESEARCH_KINDS = ["note", "url", "document", "review", "claim"] as const;

/** Upper bounds keep imports and AI prompts predictable. */
export const LIMITS = {
  shortText: 200,
  url: 2048,
  longText: 20_000,
  researchContent: 50_000,
  importFileBytes: 1_000_000,
  backupBytes: 20_000_000,
  maxEmails: 7,
} as const;

export const TEMPLATE_CATEGORIES = [
  "welcome",
  "abandoned_cart",
  "post_purchase",
  "comparison",
  "educational",
  "promotional",
  "re_engagement",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  welcome: "Welcome",
  abandoned_cart: "Abandoned Cart",
  post_purchase: "Post-Purchase",
  comparison: "Product Comparison",
  educational: "Educational",
  promotional: "Promotional",
  re_engagement: "Re-engagement",
};
