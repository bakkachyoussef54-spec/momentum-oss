import { z } from "zod";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  EMAIL_STATUSES,
  LIMITS,
  RESEARCH_CATEGORIES,
  RESEARCH_KINDS,
  RESEARCH_STATUSES,
} from "./constants";

const text = (max: number = LIMITS.longText) => z.string().trim().max(max, `Must be ${max} characters or fewer`);

/** Optional http(s) URL. Empty string is allowed; other schemes (javascript:, file:) are rejected. */
export const optionalUrl = z
  .string()
  .trim()
  .max(LIMITS.url)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Enter a full http(s) URL or leave blank");

export const brandInputSchema = z.object({
  name: text(LIMITS.shortText).min(1, "Brand name is required"),
  website: optionalUrl.default(""),
  instagramUrl: optionalUrl.default(""),
  toneOfVoice: text().default(""),
  competitors: text().default(""),
  restrictions: text().default(""),
  researchNotes: text().default(""),
  product: z.object({
    name: text(LIMITS.shortText).default(""),
    category: text(LIMITS.shortText).default(""),
    description: text().default(""),
    targetAudience: text().default(""),
    painPoints: text().default(""),
    desires: text().default(""),
    features: text().default(""),
    benefits: text().default(""),
    usp: text().default(""),
    testimonials: text().default(""),
    objections: text().default(""),
    pricing: text().default(""),
  }),
});
export type BrandInput = z.infer<typeof brandInputSchema>;

export const researchInputSchema = z.object({
  brandId: z.string().min(1),
  title: text(LIMITS.shortText).min(1, "Give this research item a title"),
  url: optionalUrl.default(""),
  kind: z.enum(RESEARCH_KINDS).default("note"),
  category: z.enum(RESEARCH_CATEGORIES).default("general"),
  content: text(LIMITS.researchContent).default(""),
  status: z.enum(RESEARCH_STATUSES).default("unreviewed"),
});
export type ResearchInput = z.infer<typeof researchInputSchema>;

export const campaignInputSchema = z.object({
  brandId: z.string().min(1, "Select a brand"),
  name: text(LIMITS.shortText).min(1, "Campaign name is required"),
  type: z.enum(CAMPAIGN_TYPES),
  audience: text().min(1, "Describe the audience for this campaign"),
  goal: text().min(1, "Define the primary goal"),
  tone: text(LIMITS.shortText).min(1, "Choose a tone of voice"),
  emailCount: z.coerce.number().int().min(1).max(LIMITS.maxEmails).default(3),
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const emailStatusSchema = z.enum(EMAIL_STATUSES);

export const emailContentSchema = z.object({
  subjectLines: z.array(text(LIMITS.shortText)).max(10).default([]),
  selectedSubject: z.number().int().min(0).max(9).default(0),
  previewText: text(LIMITS.shortText).default(""),
  hook: text(2000).default(""),
  body: text().default(""),
  cta: text(LIMITS.shortText).default(""),
  rationale: text(4000).default(""),
  researchRefs: z.array(text(500)).max(30).default([]),
});
export type EmailContent = z.infer<typeof emailContentSchema>;

export const emailMetaSchema = z.object({
  objective: text(1000).default(""),
  segment: text(500).default(""),
  role: text(500).default(""),
  framework: text(50).default(""),
});

/** Turn a ZodError into a short, user-safe message. */
export function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
