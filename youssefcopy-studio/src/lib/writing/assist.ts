import { FRAMEWORKS, type Framework } from "../constants";
import { splitList } from "../json";
import type { BriefEmail } from "../strategy/playbooks";
import type { BrandProfile, ResearchItem } from "../types";
import type { EmailSections } from "../validation";

/** Human Mode: the 12 guided steps for one email. */
export const WRITING_STEPS = [
  "objective",
  "audience",
  "pain",
  "verified_benefit",
  "framework",
  "subject",
  "preview",
  "hook",
  "body",
  "cta",
  "rationale",
  "review",
] as const;
export type WritingStep = (typeof WRITING_STEPS)[number];

export interface StepGuide {
  title: string;
  purpose: string;
  /** Writing coach: why this component matters to the reader and the result. */
  why: string;
  tips: string[];
  avoid: string[];
  /** A short exercise to practise the skill (optional, never required). */
  exercise: string;
  structures: { name: string; pattern: string; example: string }[];
}

/** Original, reusable guidance. Examples use a fictional sleep-mask brand. */
export const STEP_GUIDES: Record<WritingStep, StepGuide> = {
  objective: {
    title: "Email objective",
    purpose: "Decide the single job this email must do.",
    why: "An email with one clear job is easier to write and easier to read. Every later choice — hook, benefit, CTA — is judged against this sentence.",
    tips: ["One sentence, starting with a verb", "Describe the reader's next step, not your sales target", "Different from the other emails in the sequence"],
    avoid: ["Two goals in one email", "Vague goals like “build awareness”"],
    exercise: "Finish this sentence in under 15 words: “After reading this email, the reader will…”",
    structures: [{ name: "Reader action", pattern: "Help [reader] [take one step] by [showing one thing].", example: "Help new subscribers see why a contoured mask feels different by showing the eye-cup design." }],
  },
  audience: {
    title: "Target audience",
    purpose: "Name exactly who receives this email and where they are in the journey.",
    why: "The same product needs different words for a first-time subscriber and a customer who abandoned checkout. Naming the segment keeps the copy specific.",
    tips: ["Include their situation (new subscriber, opened email 1, bought last week…)", "Use details from your research", "One segment per email"],
    avoid: ["“Everyone”", "Demographics with no situation"],
    exercise: "Describe the reader in one line that a stranger could use to pick them out of your list.",
    structures: [{ name: "Segment + situation", pattern: "[Who] who [situation] and [what they haven't done yet].", example: "Light-sensitive sleepers who joined via the sleep quiz and haven't bought yet." }],
  },
  pain: {
    title: "Primary pain point",
    purpose: "Choose ONE problem from your research for this email.",
    why: "Readers respond to their own problem described precisely. Picking one keeps the email focused and stops it from turning into a feature list.",
    tips: ["Choose from the client's research", "Prefer the reader's own words", "Save other pains for other emails"],
    avoid: ["Stacking three problems", "Problems the product doesn't actually solve", "Medical diagnoses"],
    exercise: "Rewrite the pain point as the reader would say it to a friend.",
    structures: [{ name: "Reader's words", pattern: "“I [frustration] because [cause].”", example: "“I wake up at 5 a.m. because the streetlight comes through the curtains.”" }],
  },
  verified_benefit: {
    title: "Verified product benefit",
    purpose: "Choose ONE verified benefit that answers that pain.",
    why: "The benefit is the email's promise. Using a verified benefit means you never have to walk a claim back with the client — or the reader.",
    tips: ["Only benefits from the brief or verified research", "It must answer the chosen pain", "Outcome for the reader, not a feature"],
    avoid: ["Unverified or exaggerated claims", "Numbers that aren't in the research"],
    exercise: "Complete: “Because of [feature], you can [outcome].” using only verified facts.",
    structures: [{ name: "Feature → outcome", pattern: "Because of [feature], you can [outcome].", example: "Because of the molded eye cups, you can block the light without pressure on your eyes." }],
  },
  framework: {
    title: "Writing framework",
    purpose: "Pick the structure that fits the objective, then adjust the outline.",
    why: "A framework gives the body a logical order so the reader moves from recognition to action without friction. The right one depends on the job of the email.",
    tips: ["AIDA for introductions", "PAS for objections and pain-led emails", "BAB for transformation", "4Ps when you have verified proof", "Benefit-Led for practical emails", "Story-Based when proof is limited"],
    avoid: ["Forcing a framework that doesn't fit the objective"],
    exercise: "Write the outline in three short bullet points before drafting any sentences.",
    structures: [{ name: "Outline first", pattern: "1. [Opening move] 2. [Middle move] 3. [Closing move]", example: "1. Name early-morning light 2. Explain why flat masks feel wrong 3. Show the contour design" }],
  },
  subject: {
    title: "Subject lines",
    purpose: "Write three honest options and pick the primary one.",
    why: "The subject line decides whether the email is read at all. Three different angles give you — and your client — a real choice and something to test.",
    tips: ["Under ~50 characters", "Three genuinely different angles", "Specific beats clever"],
    avoid: ["Fake “Re:” or “Fwd:”", "ALL CAPS and stacked exclamation marks", "Discounts or deadlines that aren't on file"],
    exercise: "Write one subject that names the benefit, one that names the problem, one that asks a question.",
    structures: [
      { name: "Benefit, plainly", pattern: "[Outcome the reader wants]", example: "Darker mornings, starting tonight" },
      { name: "Name the problem", pattern: "A better answer to [problem]", example: "A better answer to early sunrises" },
      { name: "Honest question", pattern: "[Specific question the email answers]?", example: "Why do flat sleep masks feel wrong?" },
    ],
  },
  preview: {
    title: "Preview text",
    purpose: "Complete the subject line — add the second reason to open.",
    why: "Inboxes show the preview right next to the subject. If you leave it empty, they show random body text instead.",
    tips: ["40–100 characters", "Don't repeat the subject", "Hint at the payoff inside"],
    avoid: ["Leaving it blank", "“View in browser” style filler"],
    exercise: "Read your subject and preview aloud as one sentence. Does it make you want the next line?",
    structures: [
      { name: "Payoff", pattern: "[What they'll learn or get] — in a minute.", example: "The small design change that makes light-blocking comfortable." },
      { name: "Continue the thought", pattern: "[Second half of the subject's idea]", example: "And why pressure, not darkness, is usually the problem." },
    ],
  },
  hook: {
    title: "Opening hook",
    purpose: "Show the reader in the first line that this email is about their situation.",
    why: "Most readers decide in the first sentence whether to keep going. Starting with their world — not your brand — earns the next line.",
    tips: ["One or two short sentences", "Start from the chosen pain point", "A specific moment beats a general statement"],
    avoid: ["“I hope this email finds you well”", "“We're excited to announce…”", "“In today's world…”"],
    exercise: "Write the hook as a single moment the reader has lived (time, place, feeling).",
    structures: [
      { name: "Recognition", pattern: "If [specific problem] sounds familiar, you're not alone.", example: "If the first light through your curtains wakes you before your alarm, you're not alone." },
      { name: "Fair question", pattern: "Worried that [objection]? That's a fair question.", example: "Worried a sleep mask will feel hot or tight? That's a fair question." },
      { name: "Specific moment", pattern: "[A moment the reader knows well].", example: "It's 5:40 a.m., and the streetlight has already won." },
    ],
  },
  body: {
    title: "Body copy",
    purpose: "Follow your framework: deepen the problem, deliver the benefit, bridge to the CTA.",
    why: "The body turns attention into belief. Each part has a job; writing them separately keeps paragraphs short and the logic visible.",
    tips: ["Two to four short paragraphs", "Use the customer's language", "Every claim traceable to the brief"],
    avoid: ["Superlatives and hype", "Repeating the same sentence opening", "Invented urgency or promises"],
    exercise: "Cut every sentence that would still be true for a competitor's product.",
    structures: [
      { name: "Feature → meaning", pattern: "[Product] uses [feature], so [benefit for the reader].", example: "The Contour mask uses molded eye cups, so it blocks light without touching your eyes." },
      { name: "Lower the risk", pattern: "And if it isn't right for you, [documented policy].", example: "And if it isn't right for you, returns are free for 30 days." },
    ],
  },
  cta: {
    title: "Primary CTA",
    purpose: "One clear action that matches this email's objective.",
    why: "A single, specific CTA removes the reader's last decision. Several competing buttons split attention and lower clarity.",
    tips: ["Start with a verb", "Two to seven words", "Describe what happens next"],
    avoid: ["“Click here” or “Submit”", "More than one primary action"],
    exercise: "Write the CTA as what the reader will get, not what they must do.",
    structures: [
      { name: "See it", pattern: "See how [it] works", example: "See how the contour works" },
      { name: "Choose", pattern: "Find your [product]", example: "Find your fit" },
    ],
  },
  rationale: {
    title: "Strategic rationale",
    purpose: "Explain the choices to your client in two or three sentences.",
    why: "Clients approve faster when they understand the reasoning. A short rationale also protects the copy from random edits later.",
    tips: ["Name the framework and why", "Point to the research you relied on", "Keep it client-friendly"],
    avoid: ["Predicting open or click rates"],
    exercise: "Explain the email to someone who hasn't read it, in three sentences.",
    structures: [
      { name: "Why this works", pattern: "[Framework]: we open with [problem], answer with [benefit], and close with [CTA type] because [reason].", example: "PAS: we open with the comfort objection, answer it with the contoured design, and close with a low-pressure CTA because this reader is still deciding." },
    ],
  },
  review: {
    title: "Review & approve",
    purpose: "Check the essentials, read it once aloud, then approve.",
    why: "Approval freezes this version for the client package. Anything you change afterwards is flagged until you approve again.",
    tips: ["Read it aloud once", "Check every claim against the brief", "Look at the mobile preview"],
    avoid: ["Approving with [placeholders] left in", "Approving with high-severity flags"],
    exercise: "Find one sentence you can cut without losing meaning.",
    structures: [],
  },
};

/** Body-part labels per framework (stored as problem / benefit / transition). */
export const FRAMEWORK_PARTS: Record<Framework, { problem: string; benefit: string; transition: string; outline: string }> = {
  AIDA: { problem: "Interest — why this matters to the reader", benefit: "Desire — the benefit, made concrete", transition: "Bridge to action", outline: "Attention (hook) → Interest → Desire → Action (CTA)" },
  PAS: { problem: "Problem — name it precisely", benefit: "Solution — the verified answer", transition: "Agitate gently / remove the last doubt", outline: "Problem → Agitate (calmly) → Solution → CTA" },
  BAB: { problem: "Before — life with the problem", benefit: "After — life with the benefit", transition: "Bridge — how the product gets them there", outline: "Before → After → Bridge → CTA" },
  "4Ps": { problem: "Promise & picture", benefit: "Proof — verified evidence only", transition: "Push — a calm reason to act", outline: "Promise → Picture → Proof → Push (CTA)" },
  "Benefit-Led": { problem: "Context — the reader's situation", benefit: "Lead benefit and what it means", transition: "Support and next step", outline: "Lead benefit → Support → Next step (CTA)" },
  "Story-Based": { problem: "The moment — a short, specific scene", benefit: "The turn — what changed and why", transition: "The takeaway for the reader", outline: "Scene → Turn → Takeaway → CTA" },
};

export function isFramework(f: string): f is Framework {
  return (FRAMEWORKS as readonly string[]).includes(f);
}

export interface Suggestion {
  text: string;
  /** Which user inputs the text was assembled from. Shown to the user. */
  basis: string;
}

export interface AssistContext {
  brand: BrandProfile;
  research: ResearchItem[];
  plan: Pick<BriefEmail, "intent" | "framework" | "frameworkReason" | "focusProblem" | "focusPromise" | "ctaStrategy" | "position" | "objective" | "segment"> | null;
  /** The pain point and benefit the user chose in steps 3–4 (override the plan's focus). */
  chosen?: { pain?: string; benefit?: string; framework?: string };
}

export function painOptions(brand: BrandProfile, research: ResearchItem[]): string[] {
  const verified = research.filter((r) => r.status === "verified" && r.category === "pain_point").map((r) => r.content.trim());
  return Array.from(new Set([...splitList(brand.product.painPoints), ...verified].filter(Boolean)));
}

export function benefitOptions(brand: BrandProfile, research: ResearchItem[]): string[] {
  const verified = research.filter((r) => r.status === "verified" && r.category === "benefit").map((r) => r.content.trim());
  return Array.from(new Set([...splitList(brand.product.benefits), ...verified].filter(Boolean)));
}

const clean = (s: string) => s.trim().replace(/[.!?;:,]+$/, "");
const lc = (s: string) => (s && !/^[A-Z]{2,}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const uc = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const isPlaceholder = (s: string) => /^\[.*\]$/.test(s.trim());

function shorten(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—-]\s*$/, "");
}

/** Very small heuristic: does the phrase start with a third-person verb ("blocks", "stays")? */
function startsWithVerb(s: string): boolean {
  const w = s.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return /^(helps|blocks|keeps|stays|lets|makes|gives|reduces|improves|supports|fits|works|feels|uses|creates|leaves|protects|adjusts|stops|cuts|holds|moves|washes|travels|is|has)$/.test(w);
}

function inputsFor(ctx: AssistContext) {
  const p = ctx.brand.product;
  const pains = painOptions(ctx.brand, ctx.research);
  const benefits = benefitOptions(ctx.brand, ctx.research);
  const objections = splitList(p.objections);
  const planProblem = ctx.plan && !isPlaceholder(ctx.plan.focusProblem) ? ctx.plan.focusProblem : "";
  const planPromise = ctx.plan && !isPlaceholder(ctx.plan.focusPromise) ? ctx.plan.focusPromise : "";
  const verifiedReview = ctx.research.find((r) => r.status === "verified" && r.category === "testimonial" && r.content.trim());
  const isObjection = ctx.plan?.intent === "objection";
  const problem = clean(ctx.chosen?.pain || (isObjection ? pains[0] ?? "" : planProblem || pains[0] || ""));
  const promise = clean(ctx.chosen?.benefit || planPromise || benefits[0] || "");
  const missing: string[] = [];
  if (!problem) missing.push("customer pain points");
  if (!promise) missing.push("verified benefits");
  if (!objections.length) missing.push("purchase objections");
  return {
    product: p.name || ctx.brand.name,
    problem,
    problem2: clean(pains.find((x) => clean(x) !== problem) ?? ""),
    promise,
    promise2: clean(benefits.find((x) => clean(x) !== promise) ?? ""),
    objection: clean(isObjection ? planProblem || objections[0] || "" : objections[0] ?? ""),
    feature: clean(splitList(p.features)[0] ?? ""),
    usp: clean(p.usp),
    pricing: clean(p.pricing),
    testimonial: verifiedReview ? clean(verifiedReview.content).slice(0, 220) : "",
    testimonialSource: verifiedReview?.title ?? "",
    missing,
  };
}

const PH = { problem: "[customer problem from your research]", promise: "[verified benefit]", objection: "[main objection]" };

export type BodyPart = "problem" | "benefit" | "transition";

/**
 * Deterministic, rule-based text assembly from the user's verified inputs.
 * Missing inputs become visible [placeholders]; nothing is invented.
 */
export function suggestionsFor(step: WritingStep | BodyPart, ctx: AssistContext): Suggestion[] {
  const i = inputsFor(ctx);
  const intent = ctx.plan?.intent ?? "introduce";
  const problem = i.problem || PH.problem;
  const promise = i.promise || PH.promise;
  const objection = i.objection || PH.objection;
  const out: Suggestion[] = [];
  const add = (text: string, basis: string) => {
    const t = text.replace(/\s+/g, " ").replace(/\s([.,?!])/g, "$1").trim();
    if (t && !out.some((o) => o.text === t)) out.push({ text: t, basis });
  };

  switch (step) {
    case "objective": {
      if (ctx.plan?.objective) add(ctx.plan.objective, "Campaign plan");
      add(`Help the reader see how the ${i.product} solves ${lc(problem)}.`, "Product + chosen pain point");
      if (intent === "objection") add(`Answer the concern “${objection}” with verified facts so the reader feels safe to try the ${i.product}.`, "Objection");
      break;
    }
    case "audience": {
      if (ctx.plan?.segment) add(ctx.plan.segment, "Campaign plan");
      if (ctx.brand.product.targetAudience.trim()) add(ctx.brand.product.targetAudience.trim(), "Brand target audience");
      break;
    }
    case "pain":
    case "verified_benefit":
    case "framework":
    case "review":
      break;
    case "subject": {
      if (intent === "objection") {
        add(`${uc(shorten(lc(objection), 40))}? Let's talk about it`, "Objection");
        add("The question we hear most often", "Objection angle (no facts used)");
      } else if (intent === "trust" || intent === "offer") {
        add(`Why people choose the ${shorten(i.product, 32)}`, "Product name");
        add(shorten(uc(promise), 50), "Chosen benefit");
      } else {
        add(shorten(uc(promise), 50), "Chosen benefit");
        add(`A better answer to ${shorten(lc(problem), 34)}`, "Chosen pain point");
      }
      add(`Meet the ${shorten(i.product, 40)}`, "Product name");
      break;
    }
    case "preview": {
      add(`${shorten(uc(promise), 70)} — here's how.`, "Chosen benefit");
      if (i.feature) add(`The idea behind ${lc(i.feature)}, in a minute.`, "Product feature");
      if (intent === "objection") add("A straight answer, using only the facts.", "Objection angle (no facts used)");
      else add(`Written for anyone dealing with ${shorten(lc(problem), 60)}.`, "Chosen pain point");
      break;
    }
    case "hook": {
      if (intent === "objection") {
        add(`Worried that ${lc(objection)}? That's a fair question.`, "Objection");
        add(`Before trying the ${i.product}, most people ask us about this: ${lc(objection)}.`, "Objection");
      } else {
        add(`If ${lc(problem)} sounds familiar, you're not alone.`, "Chosen pain point");
        add(`${uc(problem)}? You're not the only one.`, "Chosen pain point");
      }
      if (intent === "trust") add(`You've seen what the ${i.product} does. Here's why it's worth it.`, "Product name");
      break;
    }
    case "problem": {
      add(
        `${uc(problem)}.${i.problem2 ? ` Add ${lc(i.problem2)}, and it's easy to see why it gets frustrating.` : ""} These are exactly the problems the ${i.product} was designed around.`,
        i.problem2 ? "Pain points (two)" : "Chosen pain point",
      );
      if (intent === "objection") add(`It's a reasonable concern: ${lc(objection)}. You shouldn't have to guess before you buy.`, "Objection");
      add(`For a lot of people, the frustrating part isn't the problem itself — it's that ${lc(problem)} keeps coming back.`, "Chosen pain point");
      break;
    }
    case "benefit": {
      const verbForm = startsWithVerb(promise);
      add(verbForm ? `The ${i.product} ${lc(promise)}.` : `With the ${i.product}: ${lc(promise)}.`, "Chosen benefit");
      if (i.feature) add(`The ${i.product} uses ${lc(i.feature)}${verbForm ? `, so it ${lc(promise)}` : ` — ${lc(promise)}`}.${i.promise2 ? ` It also ${startsWithVerb(i.promise2) ? lc(i.promise2) : `offers this: ${lc(i.promise2)}`}.` : ""}`, "Feature + verified benefits");
      if (i.usp) add(`What makes it different: ${lc(i.usp)}.`, "USP");
      break;
    }
    case "transition": {
      if (intent === "objection") add(`So if “${objection}” was what held you back, it's worth a second look.`, "Objection");
      if (i.testimonial) add(`Don't just take our word for it. A customer told us: “${i.testimonial}”`, `Verified testimonial: ${i.testimonialSource}`);
      if (i.pricing) add(`The details, plainly: ${i.pricing}.`, "Pricing & policy on file");
      add(`If ${lc(problem)} has been the issue, the next step is simple.`, "Chosen pain point");
      break;
    }
    case "body": {
      for (const part of ["problem", "benefit", "transition"] as const) {
        const first = suggestionsFor(part, ctx)[0];
        if (first) add(first.text, `${part} · ${first.basis}`);
      }
      break;
    }
    case "cta": {
      const short = i.product.split(/\s+/).slice(-2).join(" ");
      const byIntent: Record<string, string[]> = {
        introduce: ["See how it works", `Explore the ${short}`, "Take a closer look"],
        objection: ["Find out if it's right for you", "See the details", `Get to know the ${short}`],
        trust: [`Get your ${short}`, "Choose yours", "Shop now"],
        offer: ["Shop the offer", `Get your ${short}`, "See the offer"],
        reminder: ["Return to my cart", "Finish checking out", "Pick up where you left off"],
        thank: ["Track my order", "Read the setup guide", "Get started"],
        care: ["Read the care guide", "See how to use it", "Get the most from it"],
        next_action: ["Leave a review", "Share with a friend", "See what pairs well"],
        reconnect: ["Keep me subscribed", "See what's new", "Stay in the loop"],
        educate: ["Read the full guide", "Try it tonight", "Learn more about it"],
        transformation: [`See the ${short}`, "Start tonight", "Find your fit"],
      };
      for (const c of byIntent[intent] ?? byIntent.introduce) add(c, ctx.plan?.ctaStrategy ? "CTA strategy from the plan" : "Email intent");
      break;
    }
    case "rationale": {
      const fw = ctx.chosen?.framework || ctx.plan?.framework || "Benefit-Led";
      const reason = isFramework(fw) ? FRAMEWORK_PARTS[fw].outline : "";
      add(
        `${fw} (${reason}): this email focuses on one problem (${lc(problem)}) and one promise (${lc(promise)}). ${ctx.plan?.ctaStrategy ?? ""}`,
        "Chosen framework, pain point, benefit + plan CTA strategy",
      );
      break;
    }
  }
  if (i.missing.length && step !== "cta") {
    for (const s of out) if (s.text.includes("[")) s.basis = `${s.basis} · missing: ${i.missing.join(", ")}`;
  }
  return out.slice(0, 3);
}

/** Body = problem, benefit and transition paragraphs, in order. */
export function composeBody(sections: Pick<EmailSections, "problem" | "benefit" | "transition">): string {
  return [sections.problem, sections.benefit, sections.transition].map((s) => s.trim()).filter(Boolean).join("\n\n");
}

export interface StepState {
  subjectLines: string[];
  selectedSubject: number;
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  rationale: string;
  sections: EmailSections;
  objective: string;
  segment: string;
  framework: string;
  status: string;
}

/** A step is complete when it has content; subject lines need three filled options; review needs approval. */
export function stepComplete(step: WritingStep, c: StepState): boolean {
  switch (step) {
    case "objective":
      return Boolean(c.objective.trim());
    case "audience":
      return Boolean(c.segment.trim());
    case "pain":
      return Boolean(c.sections.painPoint.trim());
    case "verified_benefit":
      return Boolean(c.sections.benefitPoint.trim());
    case "framework":
      return Boolean(c.framework.trim());
    case "subject":
      return c.subjectLines.filter((s) => s.trim()).length >= 3 && Boolean((c.subjectLines[c.selectedSubject] ?? "").trim());
    case "preview":
      return Boolean(c.previewText.trim());
    case "hook":
      return Boolean(c.hook.trim());
    case "body":
      return Boolean(c.body.trim());
    case "cta":
      return Boolean(c.cta.trim());
    case "rationale":
      return Boolean(c.rationale.trim());
    case "review":
      return c.status === "approved";
  }
}
