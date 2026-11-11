import type { TemplateCategory } from "../constants";
import { splitList } from "../json";
import type { BrandProfile } from "../types";

export interface TemplateDefinition {
  slug: string;
  name: string;
  category: TemplateCategory;
  goal: string;
  framework: string;
  outline: string[];
  subjectLines: string[];
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  personalization: string;
}

/**
 * Original built-in templates. Placeholders use {{double_braces}}; unknown values stay as
 * visible [brackets] after applying, so nothing is silently invented.
 */
export const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  {
    slug: "welcome-central-benefit",
    name: "Welcome · The one thing we fix",
    category: "welcome",
    goal: "Welcome a new subscriber and connect the product to the one problem they joined for.",
    framework: "AIDA",
    outline: ["Attention: name the problem in the reader's words", "Interest: why it happens / why common fixes fall short", "Desire: the central benefit of {{product_name}}", "Action: one CTA to explore"],
    subjectLines: ["Welcome — let's fix {{pain_point_short}}", "You're in. Here's what {{product_name}} is for", "The small change behind {{core_benefit_short}}"],
    previewText: "A quick hello, and the one thing we built {{product_name}} to do.",
    hook: "If {{pain_point}} sounds familiar, you're in the right place.",
    body: "Welcome to {{brand_name}}. We'll keep these emails short and useful.\n\nMost people we hear from have tried the obvious fixes already. The problem usually isn't effort — it's that {{pain_point}} keeps getting in the way.\n\nThat's exactly what {{product_name}} was designed for. {{core_benefit}}.\n\nOver the next few days we'll show you how it works and answer the questions people usually ask before trying it.",
    cta: "See how {{product_name}} works",
    personalization: "Use the subscriber's first name only if it's reliably captured. Mirror the sign-up source (quiz, pop-up, giveaway) in the first line when available.",
  },
  {
    slug: "welcome-objection",
    name: "Welcome · The honest answer",
    category: "welcome",
    goal: "Address the most common reason new subscribers hesitate.",
    framework: "PAS",
    outline: ["Problem: state the objection plainly", "Agitate: why it's a fair concern", "Solution: answer with documented facts", "CTA"],
    subjectLines: ["“{{objection}}” — fair question", "The question everyone asks first", "Let's talk about {{objection_short}}"],
    previewText: "A straight answer to the question we get most.",
    hook: "Before trying {{product_name}}, most people ask us the same thing: {{objection}}",
    body: "It's a fair question — and you shouldn't have to guess.\n\nHere's the honest answer: [answer using documented facts from the brand profile].\n\n[If the client has a documented guarantee or return policy, explain it here in plain words. If not, delete this paragraph.]\n\nIf that was the thing holding you back, here's the next step.",
    cta: "Find the right {{product_name}} for you",
    personalization: "Segment by engagement: send to subscribers who opened the welcome email but haven't clicked.",
  },
  {
    slug: "abandoned-cart-reminder",
    name: "Abandoned Cart · Still thinking it over?",
    category: "abandoned_cart",
    goal: "Bring the shopper back to their cart with a calm reminder of the benefit.",
    framework: "Benefit-Led",
    outline: ["Acknowledge without pressure", "Restate the core benefit", "Remove one friction point", "Return-to-cart CTA"],
    subjectLines: ["Your {{product_name}} is waiting", "Still thinking it over?", "Saved your cart for you"],
    previewText: "No rush — here's what you picked and why people choose it.",
    hook: "You left something in your cart — no pressure, we saved it for you.",
    body: "{{product_name}} is still there whenever you're ready.\n\nQuick reminder of why people choose it: {{core_benefit}}.\n\nIf something stopped you — shipping, sizing, or just timing — reply to this email and a real person will help.",
    cta: "Return to my cart",
    personalization: "Insert the cart item image and name dynamically. Exclude anyone who purchased in the meantime.",
  },
  {
    slug: "post-purchase-thank-you",
    name: "Post-Purchase · Thank you + what's next",
    category: "post_purchase",
    goal: "Reassure the customer and set clear expectations for delivery and first use.",
    framework: "Story-Based",
    outline: ["Genuine thanks", "What happens next (shipping, timeline)", "First-use tip", "Where to get help"],
    subjectLines: ["Thank you — here's what happens next", "Your {{product_name}} is on its way", "Good choice. A few quick notes"],
    previewText: "Your order details, timeline, and one tip for your first night.",
    hook: "Thank you for your order — it genuinely means a lot to a small team like ours.",
    body: "Here's what happens next:\n\n1. We pack your order and email tracking details [timeline from client].\n2. When it arrives, [first-use tip from client care instructions].\n3. Questions? Reply to this email — it reaches a real person.\n\nWe'll check in once it's arrived with a couple of tips to get the most out of it.",
    cta: "Track my order",
    personalization: "Use order data (product variant, delivery estimate). Never include medical advice.",
  },
  {
    slug: "comparison-honest",
    name: "Product Comparison · An honest side-by-side",
    category: "comparison",
    goal: "Help readers choose between options (or vs. common alternatives) without disparaging competitors.",
    framework: "4Ps",
    outline: ["Promise: help them choose", "Picture: who each option suits", "Proof: verified differences only", "Push: CTA to the best fit"],
    subjectLines: ["Which one is right for you?", "{{product_name}} vs. the usual fix", "An honest comparison"],
    previewText: "A quick side-by-side so you can choose with confidence.",
    hook: "Choosing between options shouldn't require a spreadsheet. Here's the short version.",
    body: "If you mainly care about [criterion 1], [option A] is the better fit.\nIf [criterion 2] matters more, choose [option B].\n\nWhat makes {{product_name}} different: {{usp}}.\n\nOnly compare on facts the client can verify — no claims about competitors you can't source.",
    cta: "Compare the options",
    personalization: "Segment by browsing behavior; show the variant they viewed first.",
  },
  {
    slug: "educational-one-idea",
    name: "Educational · One useful idea",
    category: "educational",
    goal: "Build trust by teaching one practical idea related to the product category.",
    framework: "Benefit-Led",
    outline: ["One idea in the subject and hook", "Why it matters", "How to apply it today", "Soft CTA"],
    subjectLines: ["One small habit that helps with {{pain_point_short}}", "Try this tonight", "The 2-minute fix most people skip"],
    previewText: "A practical tip you can use today — no purchase needed.",
    hook: "Here's a small change that's easy to try today.",
    body: "[Explain the idea in 2–3 short sentences. Use general, well-established guidance only — no medical claims.]\n\nWhy it helps: [plain-language reason].\n\nHow to try it: [1–3 simple steps].\n\n{{product_name}} can make this easier because {{core_benefit}} — but the habit works on its own too.",
    cta: "Read the full guide",
    personalization: "Rotate tips by customer stage (subscriber vs. customer).",
  },
  {
    slug: "promotional-clear-offer",
    name: "Promotional · Clear, honest offer",
    category: "promotional",
    goal: "Announce an approved promotion clearly, tied to the core benefit.",
    framework: "4Ps",
    outline: ["Exact offer and dates", "Why it's worth it beyond the price", "Verified proof", "Shop CTA"],
    subjectLines: ["{{offer}} — through {{offer_end}}", "A good time to try {{product_name}}", "Our {{offer_short}} is live"],
    previewText: "The details, the dates, and nothing in fine print.",
    hook: "Straight to it: {{offer}}.",
    body: "The offer: {{offer}}. It runs until {{offer_end}}.\n\nWhy now is a good time: {{core_benefit}}.\n\n[Add one verified review or remove this line.]\n\nNo countdown tricks — when it ends, it ends.",
    cta: "Shop the offer",
    personalization: "Only send to customers eligible for the offer. Use the client's exact terms.",
  },
  {
    slug: "re-engagement-check-in",
    name: "Re-engagement · Still want these?",
    category: "re_engagement",
    goal: "Re-engage inactive subscribers or let them go gracefully.",
    framework: "Story-Based",
    outline: ["Honest check-in", "Remind of value", "Clear choice: stay or leave"],
    subjectLines: ["Should we stop emailing you?", "Still want to hear from us?", "Quick question, {{first_name}}"],
    previewText: "One click to stay — or we'll take the hint.",
    hook: "We noticed you haven't opened our emails in a while — totally fine.",
    body: "Inboxes get busy. If our emails still help you with {{pain_point_short}}, click below and we'll keep them coming.\n\nIf not, no hard feelings — you can unsubscribe any time with the link at the bottom.",
    cta: "Keep me subscribed",
    personalization: "Send only to subscribers inactive for 60–90+ days. Suppress anyone who doesn't respond after the final email.",
  },
];

/** Recommend a starting template for a planned email, by campaign type then strategic intent. */
export function suggestTemplateSlug(campaignType: string, intent: string): string {
  if (campaignType === "abandoned_cart") return intent === "objection" ? "welcome-objection" : intent === "offer" ? "promotional-clear-offer" : "abandoned-cart-reminder";
  if (campaignType === "re_engagement" || campaignType === "win_back") return intent === "offer" ? "promotional-clear-offer" : intent === "educate" ? "educational-one-idea" : "re-engagement-check-in";
  switch (intent) {
    case "objection":
      return "welcome-objection";
    case "educate":
    case "care":
    case "next_action":
      return campaignType === "post_purchase" && intent !== "next_action" ? "post-purchase-thank-you" : "educational-one-idea";
    case "offer":
      return "promotional-clear-offer";
    case "reminder":
      return "abandoned-cart-reminder";
    case "thank":
      return "post-purchase-thank-you";
    case "reconnect":
      return "re-engagement-check-in";
    default:
      return "welcome-central-benefit";
  }
}

function short(text: string, words = 5): string {
  return text.split(/\s+/).slice(0, words).join(" ").replace(/[.,;:]$/, "");
}

/** Build placeholder values from a brand profile. Missing values stay as visible [brackets]. */
export function placeholderValues(brand: BrandProfile | null): Record<string, string> {
  if (!brand) return {};
  const p = brand.product;
  const pain = splitList(p.painPoints)[0] ?? "";
  const benefit = splitList(p.benefits)[0] ?? "";
  const objection = splitList(p.objections)[0] ?? "";
  const v: Record<string, string> = {
    brand_name: brand.name,
    product_name: p.name || brand.name,
    pain_point: pain,
    pain_point_short: pain ? short(pain, 4).toLowerCase() : "",
    core_benefit: benefit,
    core_benefit_short: benefit ? short(benefit, 4).toLowerCase() : "",
    objection,
    objection_short: objection ? short(objection, 4).toLowerCase() : "",
    usp: p.usp,
  };
  return Object.fromEntries(Object.entries(v).filter(([, value]) => value.trim().length > 0));
}

export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => values[key] ?? `[${key.replace(/_/g, " ")}]`);
}

export interface TemplateLike {
  subjectLines: string[];
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  framework: string;
  goal: string;
}

export function applyTemplate(template: TemplateLike, brand: BrandProfile | null) {
  const values = placeholderValues(brand);
  return {
    subjectLines: template.subjectLines.map((s) => fillPlaceholders(s, values)),
    previewText: fillPlaceholders(template.previewText, values),
    hook: fillPlaceholders(template.hook, values),
    body: fillPlaceholders(template.body, values),
    cta: fillPlaceholders(template.cta, values),
  };
}
