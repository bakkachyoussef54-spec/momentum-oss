import { z } from "zod";
import { CAMPAIGN_TYPE_LABELS, type CampaignType, type Framework } from "../constants";
import { analyzePsychology, validateResearch } from "../research/validate";
import type { BrandProfile, ResearchItem } from "../types";

/** What an email is trying to do; drives framework choice. */
export type EmailIntent =
  | "introduce"
  | "objection"
  | "trust"
  | "transformation"
  | "educate"
  | "offer"
  | "reminder"
  | "thank"
  | "care"
  | "next_action"
  | "reconnect";

interface RoleDefinition {
  role: string;
  intent: EmailIntent;
  objective: string;
  segment: string;
  timing: string;
  keyPoints: string[];
}

const PLAYBOOKS: Record<CampaignType, RoleDefinition[]> = {
  welcome: [
    { role: "Introduce the product and its primary benefit", intent: "introduce", objective: "Make a strong first impression and connect the product to the reader's main problem.", segment: "New subscribers who have not purchased", timing: "Immediately after sign-up", keyPoints: ["Welcome warmly", "Name the primary problem", "Introduce the central benefit", "Single CTA to explore the product"] },
    { role: "Address the most important customer objection", intent: "objection", objective: "Remove the biggest reason the reader hesitates to buy.", segment: "New subscribers who opened email 1 but did not purchase", timing: "Day 2", keyPoints: ["State the objection honestly", "Answer with verified facts", "Reassure (returns, guarantee) only if documented"] },
    { role: "Reinforce the value and guide the purchase decision", intent: "trust", objective: "Reinforce the value with verified evidence and make the purchase decision easy.", segment: "New subscribers who have not purchased", timing: "Day 4", keyPoints: ["Use verified reviews only", "Recap the core promise", "Clear purchase CTA"] },
    { role: "Show the after-state", intent: "transformation", objective: "Help the reader picture life with the problem solved.", segment: "Engaged non-buyers", timing: "Day 6", keyPoints: ["Before/after contrast", "Keep it believable"] },
    { role: "Educate on getting the most from the product", intent: "educate", objective: "Give genuinely useful guidance related to the product category.", segment: "All new subscribers", timing: "Day 8", keyPoints: ["One practical tip", "Soft CTA"] },
  ],
  abandoned_cart: [
    { role: "Gentle reminder", intent: "reminder", objective: "Remind the shopper what they left and why they wanted it.", segment: "Shoppers who abandoned checkout in the last 1–4 hours", timing: "1–4 hours after abandonment", keyPoints: ["Show the product", "Restate the central benefit", "Return-to-cart CTA"] },
    { role: "Handle the hesitation", intent: "objection", objective: "Answer the most likely reason they didn't finish checking out.", segment: "Shoppers who did not return after email 1", timing: "24 hours", keyPoints: ["Name the likely objection", "Answer with documented policies (shipping, returns)"] },
    { role: "Final nudge with verified incentive", intent: "offer", objective: "Give a final reason to complete the purchase — only use incentives the client approved.", segment: "Shoppers who still have not purchased", timing: "48–72 hours", keyPoints: ["Use approved incentive only", "No fake scarcity"] },
  ],
  post_purchase: [
    { role: "Thank the customer and clarify next steps", intent: "thank", objective: "Confirm a good decision and set expectations for delivery and first use.", segment: "New customers (first order)", timing: "Immediately after purchase", keyPoints: ["Genuine thanks", "What happens next", "Where to get help"] },
    { role: "Explain responsible usage and care", intent: "care", objective: "Help the customer use and care for the product correctly so they get the promised benefit.", segment: "Customers whose order has been delivered", timing: "2–3 days after delivery", keyPoints: ["Practical usage steps", "Care instructions from the client", "No medical advice"] },
    { role: "Add value and encourage a relevant next action", intent: "next_action", objective: "Deepen the relationship with useful content and one relevant next step (review, referral, or complementary product).", segment: "Customers 2 weeks after delivery", timing: "Day 14", keyPoints: ["Useful tip", "One next action"] },
  ],
  product_launch: [
    { role: "Announce and build curiosity", intent: "introduce", objective: "Introduce the new product and the problem it was designed for.", segment: "Full engaged list", timing: "Launch day", keyPoints: ["Why it exists", "Central benefit", "CTA to see it"] },
    { role: "Show how it works", intent: "educate", objective: "Explain the features that matter and what they mean for the customer.", segment: "Openers of the launch email", timing: "Launch +2 days", keyPoints: ["Feature → benefit", "Specific details"] },
    { role: "Make the case to buy", intent: "offer", objective: "Bring together promise, proof and offer for a clear purchase decision.", segment: "Engaged non-buyers", timing: "Launch +5 days", keyPoints: ["Verified proof", "Approved launch offer only"] },
  ],
  promotional: [
    { role: "Announce the offer", intent: "offer", objective: "Present the approved promotion clearly and tie it to the core benefit.", segment: "Full engaged list", timing: "Promo start", keyPoints: ["Exact offer terms", "Core benefit", "Shop CTA"] },
    { role: "Benefit reminder", intent: "transformation", objective: "Remind readers why the product is worth it, beyond the discount.", segment: "Non-purchasers", timing: "Mid-promo", keyPoints: ["Before/after", "One benefit"] },
    { role: "Honest closing reminder", intent: "reminder", objective: "Remind readers the promotion ends — only use the real end date.", segment: "Non-purchasers", timing: "Final day (only if the promo truly ends)", keyPoints: ["Real deadline only", "Calm tone"] },
  ],
  win_back: [
    { role: "Reconnect", intent: "reconnect", objective: "Re-open the conversation with lapsed customers without guilt-tripping.", segment: "Customers with no purchase in 90+ days", timing: "Day 0", keyPoints: ["Acknowledge time passed", "Remind of the benefit they bought for"] },
    { role: "Show what's possible again", intent: "transformation", objective: "Remind them what changed when the product worked for them.", segment: "Lapsed customers who did not respond", timing: "Day 4", keyPoints: ["Before/after", "Anything new (verified)"] },
    { role: "Clear incentive to return", intent: "offer", objective: "Offer an approved reason to come back, or a graceful goodbye.", segment: "Lapsed customers who still did not respond", timing: "Day 8", keyPoints: ["Approved incentive only", "Respect their choice"] },
  ],
  educational: [
    { role: "Teach one useful idea", intent: "educate", objective: "Deliver genuinely useful information connected to the product's category.", segment: "Engaged subscribers", timing: "Any", keyPoints: ["One idea", "Practical takeaway", "Soft CTA"] },
    { role: "Apply the idea", intent: "care", objective: "Show how to put the idea into practice, with the product as one helpful option.", segment: "Openers of email 1", timing: "+3 days", keyPoints: ["Steps", "Product role"] },
    { role: "Connect to the product", intent: "trust", objective: "Bridge from education to the product with verified proof.", segment: "Engaged non-buyers", timing: "+6 days", keyPoints: ["Proof", "Clear CTA"] },
  ],
  re_engagement: [
    { role: "Check in", intent: "reconnect", objective: "Re-engage inactive subscribers with something worth opening.", segment: "Subscribers with no opens in 60+ days", timing: "Day 0", keyPoints: ["Short", "Useful", "No guilt"] },
    { role: "Remind them of the value", intent: "educate", objective: "Show what they get from staying subscribed.", segment: "Non-openers of email 1", timing: "Day 4", keyPoints: ["Value of the list", "Best content"] },
    { role: "Preference or goodbye", intent: "next_action", objective: "Ask them to confirm they want to stay, and make it easy to leave.", segment: "Still inactive", timing: "Day 8", keyPoints: ["Clear choice", "Respectful tone"] },
  ],
};

const EXTRA_ROLES: RoleDefinition[] = [
  { role: "Answer a secondary objection", intent: "objection", objective: "Address another common hesitation using verified facts.", segment: "Engaged non-buyers", timing: "+2 days after previous", keyPoints: ["One objection", "Factual answer"] },
  { role: "Share a customer story", intent: "trust", objective: "Build trust through a verified customer experience.", segment: "Engaged non-buyers", timing: "+2 days after previous", keyPoints: ["Verified story only"] },
  { role: "Practical tips", intent: "educate", objective: "Offer useful, non-promotional guidance.", segment: "All recipients", timing: "+2 days after previous", keyPoints: ["Tips", "Soft CTA"] },
];

export const FRAMEWORK_REASONS: Record<Framework, string> = {
  AIDA: "AIDA suits introductions: earn attention, build interest, create desire, then ask for one action.",
  PAS: "PAS suits objection and pain-led emails: name the problem precisely before presenting the answer.",
  BAB: "BAB suits transformation emails: contrast the reader's current state with the after-state and bridge with the product.",
  "4Ps": "4Ps suits offers backed by verified proof: promise, picture, proof, push.",
  "Benefit-Led": "Benefit-led copy suits practical emails: lead with the most relevant benefit and keep it simple.",
  "Story-Based": "A short story suits trust and reconnection emails where proof is limited: show, don't claim.",
};

/** Select a framework from the email's intent and the evidence available — never at random. */
export function selectFramework(intent: EmailIntent, ctx: { proofAvailable: boolean; hasPricing: boolean }): Framework {
  switch (intent) {
    case "introduce":
      return "AIDA";
    case "objection":
      return "PAS";
    case "transformation":
      return "BAB";
    case "trust":
      return ctx.proofAvailable ? "4Ps" : "Story-Based";
    case "offer":
      return ctx.proofAvailable && ctx.hasPricing ? "4Ps" : "Benefit-Led";
    case "reconnect":
    case "thank":
      return "Story-Based";
    case "educate":
    case "care":
    case "reminder":
    case "next_action":
      return "Benefit-Led";
  }
}

export const briefEmailSchema = z.object({
  position: z.number().int(),
  role: z.string(),
  intent: z.string(),
  objective: z.string(),
  framework: z.string(),
  frameworkReason: z.string(),
  segment: z.string(),
  timing: z.string(),
  keyPoints: z.array(z.string()),
  focusProblem: z.string(),
  focusPromise: z.string(),
  // Added in V2; defaults keep briefs stored by V1 readable.
  mainMessage: z.string().default(""),
  ctaStrategy: z.string().default(""),
  supportingResearch: z.array(z.string()).default([]),
});

export const campaignBriefSchema = z.object({
  strategy: z.string(),
  primaryProblem: z.string(),
  primaryPromise: z.string(),
  topObjection: z.string(),
  readiness: z.string(),
  warnings: z.array(z.string()),
  emails: z.array(briefEmailSchema),
  createdBy: z.literal("planner"),
  createdAt: z.string(),
});
export type CampaignBrief = z.infer<typeof campaignBriefSchema>;
export type BriefEmail = z.infer<typeof briefEmailSchema>;

export function rolesFor(type: CampaignType, count: number): RoleDefinition[] {
  const base = PLAYBOOKS[type];
  const roles: RoleDefinition[] = [];
  for (let i = 0; i < count; i++) roles.push(base[i] ?? EXTRA_ROLES[(i - base.length) % EXTRA_ROLES.length]);
  return roles;
}

export const CTA_STRATEGIES: Record<EmailIntent, string> = {
  introduce: "Low-commitment CTA that invites the reader to see how the product works (product page), not a hard sell.",
  objection: "Reassurance CTA that follows directly from the answer to the objection, e.g. checking fit or details on the product page.",
  trust: "Direct purchase CTA to the product page; mention guarantees or returns only if they are documented in the brief.",
  transformation: "Benefit-led CTA that points to the product page and echoes the after-state.",
  educate: "Soft CTA to useful content or the product page; no pressure.",
  offer: "Clear offer CTA using the client's approved terms and real dates only.",
  reminder: "Return-to-cart CTA with a calm tone and no invented scarcity.",
  thank: "Utility CTA such as tracking the order or reading the setup guide.",
  care: "Helpful CTA to care or usage guidance.",
  next_action: "One relevant next step: leave a review, refer a friend, or view a complementary product.",
  reconnect: "Soft re-engagement CTA that makes it easy to stay or leave.",
};

function lcFirst(s: string) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** One-sentence main message per email, assembled only from the brief. */
export function mainMessageFor(intent: EmailIntent, product: string, problem: string, promise: string, proofAvailable: boolean): string {
  const p = lcFirst(promise.replace(/[.!]+$/, ""));
  const prob = problem.replace(/[.!?]+$/, "");
  switch (intent) {
    case "introduce":
      return `${product} is built for people dealing with ${lcFirst(prob)} — its primary benefit: ${p}.`;
    case "objection":
      return `The concern “${prob}” has a factual answer: ${p}.`;
    case "trust":
      return `Reinforce why ${product} is worth it — ${p}${proofAvailable ? " — backed by verified customer feedback" : ""} — and make the decision easy.`;
    case "transformation":
      return `Picture the after-state: ${p}.`;
    case "offer":
      return `An approved offer makes this a good time to try ${product}: ${p}.`;
    case "reminder":
      return `${product} is still waiting, and the reason it was chosen still stands: ${p}.`;
    case "thank":
      return `Thank the customer and set clear expectations for delivery and first use of ${product}.`;
    case "care":
      return `Help the customer use ${product} correctly so they get the promised benefit: ${p}.`;
    case "next_action":
      return "Add value after purchase and suggest one relevant next step.";
    case "reconnect":
      return `Re-open the conversation by reminding the reader why they joined: ${p}.`;
    case "educate":
      return `Teach one useful idea about ${lcFirst(prob)}, with ${product} as one helpful option.`;
  }
}

const RESEARCH_FOR_INTENT: Record<EmailIntent, string[]> = {
  introduce: ["benefit", "general"],
  objection: ["objection", "pricing", "benefit"],
  trust: ["testimonial", "benefit", "claim"],
  transformation: ["desire", "benefit"],
  educate: ["general", "benefit"],
  offer: ["pricing", "benefit"],
  reminder: ["benefit", "pricing"],
  thank: ["general", "pricing"],
  care: ["general", "benefit"],
  next_action: ["general", "testimonial"],
  reconnect: ["benefit", "desire"],
};

const PROFILE_FOR_INTENT: Record<EmailIntent, (keyof BrandProfile["product"])[]> = {
  introduce: ["benefits", "painPoints", "usp"],
  objection: ["objections", "benefits", "pricing"],
  trust: ["testimonials", "benefits", "usp"],
  transformation: ["desires", "benefits"],
  educate: ["painPoints", "features"],
  offer: ["pricing", "benefits"],
  reminder: ["benefits", "pricing"],
  thank: ["description"],
  care: ["features", "benefits"],
  next_action: ["benefits"],
  reconnect: ["benefits", "desires"],
};

const PROFILE_LABELS: Record<string, string> = {
  benefits: "benefits",
  painPoints: "pain points",
  usp: "USP",
  objections: "objections",
  pricing: "pricing",
  testimonials: "testimonials",
  desires: "desires",
  features: "features",
  description: "description",
};

/** Verified research titles plus filled profile fields relevant to the email's intent. */
export function supportingResearchFor(intent: EmailIntent, brand: BrandProfile, research: ResearchItem[]): string[] {
  const cats = RESEARCH_FOR_INTENT[intent];
  const fromResearch = research
    .filter((r) => r.status === "verified" && cats.includes(r.category))
    .sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category))
    .slice(0, 4)
    .map((r) => r.title);
  const fromProfile = PROFILE_FOR_INTENT[intent].filter((k) => brand.product[k].trim()).map((k) => `Profile: ${PROFILE_LABELS[k] ?? k}`);
  return [...fromResearch, ...fromProfile];
}

/**
 * Stages C + D — Email Strategy and Campaign Outline.
 * Deterministic planner: each email gets a distinct role, one problem and one promise.
 */
export function buildCampaignBrief(input: {
  type: CampaignType;
  emailCount: number;
  audience: string;
  goal: string;
  tone: string;
  brand: BrandProfile;
  research: ResearchItem[];
  now?: Date;
}): CampaignBrief {
  const psych = analyzePsychology(input.brand, input.research);
  const validation = validateResearch(input.brand, input.research, { campaignType: input.type });
  const hasPricing = input.brand.product.pricing.trim().length > 0;
  const roles = rolesFor(input.type, input.emailCount);
  const productName = input.brand.product.name || input.brand.name;

  const pick = (list: string[], i: number, fallback: string) => (list.length ? list[i % list.length] : fallback);

  const emails: BriefEmail[] = roles.map((r, i) => {
    const framework = selectFramework(r.intent, { proofAvailable: psych.proofAvailable, hasPricing });
    const focusProblem =
      r.intent === "objection" ? pick(psych.objections, roles.slice(0, i).filter((x) => x.intent === "objection").length, "[Add a purchase objection to the brand profile]") : pick(psych.painPoints, i, "[Add a customer pain point]");
    const focusPromise = pick(psych.benefits, i, "[Add a verified benefit]");
    return {
      position: i + 1,
      role: r.role,
      intent: r.intent,
      objective: r.objective,
      framework,
      frameworkReason: FRAMEWORK_REASONS[framework],
      segment: r.segment,
      timing: r.timing,
      keyPoints: r.keyPoints,
      focusProblem,
      focusPromise,
      mainMessage: mainMessageFor(r.intent, productName, focusProblem, focusPromise, psych.proofAvailable),
      ctaStrategy: CTA_STRATEGIES[r.intent],
      supportingResearch: supportingResearchFor(r.intent, input.brand, input.research),
    };
  });

  const strategy = [
    `${CAMPAIGN_TYPE_LABELS[input.type]} for ${productName}, written for ${input.audience.trim() || "the brand's target audience"}.`,
    `Primary goal: ${input.goal.trim() || "not yet defined"}.`,
    `The sequence moves the reader step by step — ${emails.map((e) => e.role.toLowerCase()).join(" → ")} — with one problem and one promise per email.`,
    psych.proofAvailable
      ? "Verified reviews are available and are reserved for the trust-building email."
      : "No verified reviews are on file, so the sequence relies on clear benefits and honest reassurance rather than social proof.",
    `Tone: ${input.tone || input.brand.toneOfVoice || "match the brand voice"}.`,
  ].join(" ");

  return {
    strategy,
    primaryProblem: psych.primaryProblem,
    primaryPromise: psych.benefits[0] ?? "",
    topObjection: psych.topObjection,
    readiness: validation.readiness,
    warnings: [...validation.missing.filter((m) => m.severity === "required").map((m) => `Missing: ${m.label}`), ...validation.warnings],
    emails,
    createdBy: "planner",
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}
