import { splitList } from "../json";
import type { BriefEmail } from "../strategy/playbooks";
import type { BrandProfile, ResearchItem } from "../types";
import type { EmailSections } from "../validation";

export const WRITING_STEPS = ["subject", "preview", "hook", "problem", "benefit", "transition", "cta", "rationale"] as const;
export type WritingStep = (typeof WRITING_STEPS)[number];

export interface StepGuide {
  title: string;
  purpose: string;
  tips: string[];
  avoid: string[];
  structures: { name: string; pattern: string; example: string }[];
}

/** Original, reusable structures. Examples use a fictional sleep-mask brand. */
export const STEP_GUIDES: Record<WritingStep, StepGuide> = {
  subject: {
    title: "Subject line",
    purpose: "Earn the open honestly. Promise exactly what the email delivers.",
    tips: ["Under ~50 characters so it isn't cut off on mobile", "Write three genuinely different angles", "Specific beats clever"],
    avoid: ["Fake “Re:” or “Fwd:”", "ALL CAPS and stacked exclamation marks", "Discounts or deadlines that aren't on file"],
    structures: [
      { name: "Benefit, plainly", pattern: "[Outcome the reader wants]", example: "Darker mornings, starting tonight" },
      { name: "Name the problem", pattern: "A better answer to [problem]", example: "A better answer to early sunrises" },
      { name: "Honest question", pattern: "[Specific question the email answers]?", example: "Why do flat sleep masks feel wrong?" },
    ],
  },
  preview: {
    title: "Preview text",
    purpose: "Complete the subject line — add the second reason to open.",
    tips: ["40–100 characters", "Don't repeat the subject", "Hint at the payoff inside"],
    avoid: ["Leaving it blank (inboxes show random body text)", "“View in browser” style filler"],
    structures: [
      { name: "Payoff", pattern: "[What they'll learn or get] — in a minute.", example: "The small design change that makes light-blocking comfortable." },
      { name: "Continue the thought", pattern: "[Second half of the subject's idea]", example: "And why pressure, not darkness, is usually the problem." },
    ],
  },
  hook: {
    title: "Opening hook",
    purpose: "Show the reader in the first line that this email is about their situation.",
    tips: ["One or two short sentences", "Start with their world, not your brand", "A specific moment beats a general statement"],
    avoid: ["“I hope this email finds you well”", "“We're excited to announce…”", "Starting with “In today's world…”"],
    structures: [
      { name: "Recognition", pattern: "If [specific problem] sounds familiar, you're not alone.", example: "If the first light through your curtains wakes you before your alarm, you're not alone." },
      { name: "Fair question", pattern: "Worried that [objection]? That's a fair question.", example: "Worried a sleep mask will feel hot or tight? That's a fair question." },
      { name: "Specific moment", pattern: "[A moment the reader knows well].", example: "It's 5:40 a.m., and the streetlight has already won." },
    ],
  },
  problem: {
    title: "Problem & context",
    purpose: "Describe the problem the way the reader experiences it, so they feel understood.",
    tips: ["Use the customer's own language from your research", "One problem per email", "Two to four sentences"],
    avoid: ["Exaggerating the problem", "Medical language or diagnoses", "Blaming the reader"],
    structures: [
      { name: "Name it, then deepen it", pattern: "[Problem]. [Why it matters / what it costs them day to day].", example: "Flat masks block the light, but they press on your eyes all night. So you notice the mask instead of falling asleep." },
      { name: "Common fix falls short", pattern: "Most people try [common fix]. The trouble is [why it doesn't solve it].", example: "Most people try blackout curtains. The trouble is they don't travel with you." },
    ],
  },
  benefit: {
    title: "Product benefit",
    purpose: "Connect one verified benefit to the problem you just described.",
    tips: ["Feature → what it means for the reader", "Use only benefits from the brief or verified research", "One main promise"],
    avoid: ["Superlatives (“best”, “revolutionary”)", "Clinical or medical claims", "Numbers that aren't in your research"],
    structures: [
      { name: "Feature → meaning", pattern: "[Product] uses [feature], so [benefit for the reader].", example: "The Contour mask uses molded eye cups, so it blocks light without touching your eyes." },
      { name: "Before / after", pattern: "Instead of [problem], [after-state].", example: "Instead of adjusting a mask all night, you forget you're wearing it." },
    ],
  },
  transition: {
    title: "Persuasive transition",
    purpose: "Bridge from the benefit to the action — answer “why now?” or “what's the risk?” honestly.",
    tips: ["Handle one doubt", "Mention returns or guarantees only if documented", "Keep it calm"],
    avoid: ["Invented urgency or scarcity", "Promises you can't back up"],
    structures: [
      { name: "Lower the risk", pattern: "And if it isn't right for you, [documented policy].", example: "And if it isn't right for you, returns are free for 30 days." },
      { name: "Simple next step", pattern: "If [problem] has been the issue, the next step is simple.", example: "If early light has been the problem, the next step is simple." },
    ],
  },
  cta: {
    title: "Primary CTA",
    purpose: "One clear action that matches this email's objective.",
    tips: ["Start with a verb", "Two to seven words", "Describe what happens next"],
    avoid: ["“Click here” or “Submit”", "Several competing buttons"],
    structures: [
      { name: "See it", pattern: "See how [it] works", example: "See how the contour works" },
      { name: "Choose", pattern: "Find your [product]", example: "Find your fit" },
    ],
  },
  rationale: {
    title: "Strategic rationale",
    purpose: "Explain the choice to your client in two or three sentences: angle, structure, CTA.",
    tips: ["Name the framework and why", "Point to the research you relied on", "Keep it client-friendly"],
    avoid: ["Predicting open or click rates"],
    structures: [
      { name: "Why this works", pattern: "[Framework]: we open with [problem], answer with [benefit], and close with [CTA type] because [reason].", example: "PAS: we open with the comfort objection, answer it with the contoured design, and close with a low-pressure CTA because this reader is still deciding." },
    ],
  },
};

export interface Suggestion {
  text: string;
  /** Which user inputs the text was assembled from. Shown to the user. */
  basis: string;
}

export interface AssistContext {
  brand: BrandProfile;
  research: ResearchItem[];
  plan: Pick<BriefEmail, "intent" | "framework" | "frameworkReason" | "focusProblem" | "focusPromise" | "ctaStrategy" | "position"> | null;
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

interface Inputs {
  product: string;
  problem: string;
  problem2: string;
  promise: string;
  promise2: string;
  objection: string;
  feature: string;
  usp: string;
  pricing: string;
  testimonial: string;
  testimonialSource: string;
  missing: string[];
}

function inputsFor(ctx: AssistContext): Inputs {
  const p = ctx.brand.product;
  const pains = splitList(p.painPoints);
  const benefits = [...splitList(p.benefits), ...ctx.research.filter((r) => r.status === "verified" && r.category === "benefit").map((r) => r.content.trim())];
  const objections = splitList(p.objections);
  const planProblem = ctx.plan && !isPlaceholder(ctx.plan.focusProblem) ? ctx.plan.focusProblem : "";
  const planPromise = ctx.plan && !isPlaceholder(ctx.plan.focusPromise) ? ctx.plan.focusPromise : "";
  const verifiedReview = ctx.research.find((r) => r.status === "verified" && r.category === "testimonial" && r.content.trim());
  const missing: string[] = [];
  const problem = clean(ctx.plan?.intent === "objection" ? pains[0] ?? "" : planProblem || pains[0] || "");
  const promise = clean(planPromise || benefits[0] || "");
  if (!problem) missing.push("customer pain points");
  if (!promise) missing.push("verified benefits");
  if (!objections.length) missing.push("purchase objections");
  return {
    product: p.name || ctx.brand.name,
    problem,
    problem2: clean(pains.find((x) => clean(x) !== problem) ?? ""),
    promise,
    promise2: clean(benefits.find((x) => clean(x) !== promise) ?? ""),
    objection: clean(ctx.plan?.intent === "objection" ? planProblem || objections[0] || "" : objections[0] ?? ""),
    feature: clean(splitList(p.features)[0] ?? ""),
    usp: clean(p.usp),
    pricing: clean(p.pricing),
    testimonial: verifiedReview ? clean(verifiedReview.content).slice(0, 220) : "",
    testimonialSource: verifiedReview?.title ?? "",
    missing,
  };
}

const PH = {
  problem: "[customer problem from your research]",
  promise: "[verified benefit]",
  objection: "[main objection]",
  feature: "[product feature]",
};

/**
 * Deterministic, rule-based text assembly from the user's verified inputs.
 * Missing inputs become visible [placeholders]; nothing is invented.
 */
export function suggestionsFor(step: WritingStep, ctx: AssistContext): Suggestion[] {
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
    case "subject": {
      if (intent === "objection") {
        add(`${uc(shorten(lc(objection), 40))}? Let's talk about it`, "Objection");
        add("The question we hear most often", "Objection angle (no facts used)");
      } else if (intent === "trust" || intent === "offer") {
        add(`Why people choose the ${shorten(i.product, 32)}`, "Product name");
        add(shorten(uc(promise), 50), "Verified benefit");
      } else {
        add(shorten(uc(promise), 50), "Verified benefit");
        add(`A better answer to ${shorten(lc(problem), 34)}`, "Pain point");
      }
      add(`Meet the ${shorten(i.product, 40)}`, "Product name");
      break;
    }
    case "preview": {
      add(`${shorten(uc(promise), 70)} — here's how.`, "Verified benefit");
      if (i.feature) add(`The idea behind ${lc(i.feature)}, in a minute.`, "Product feature");
      if (intent === "objection") add("A straight answer, using only the facts.", "Objection angle (no facts used)");
      else add(`Written for anyone dealing with ${shorten(lc(problem), 60)}.`, "Pain point");
      break;
    }
    case "hook": {
      if (intent === "objection") {
        add(`Worried that ${lc(objection)}? That's a fair question.`, "Objection");
        add(`Before trying the ${i.product}, most people ask us about this: ${lc(objection)}.`, "Objection");
      } else {
        add(`If ${lc(problem)} sounds familiar, you're not alone.`, "Pain point");
        add(`${uc(problem)}? You're not the only one.`, "Pain point");
      }
      if (intent === "trust") add(`You've seen what the ${i.product} does. Here's why it's worth it.`, "Product name");
      break;
    }
    case "problem": {
      add(
        `${uc(problem)}.${i.problem2 ? ` Add ${lc(i.problem2)}, and it's easy to see why it gets frustrating.` : ""} These are exactly the problems the ${i.product} was designed around.`,
        i.problem2 ? "Pain points (two)" : "Pain point",
      );
      if (intent === "objection") add(`It's a reasonable concern: ${lc(objection)}. You shouldn't have to guess before you buy.`, "Objection");
      add(`For a lot of people, the frustrating part isn't the problem itself — it's that ${lc(problem)} keeps coming back.`, "Pain point");
      break;
    }
    case "benefit": {
      const verbForm = startsWithVerb(promise);
      add(verbForm ? `The ${i.product} ${lc(promise)}.` : `With the ${i.product}: ${lc(promise)}.`, "Verified benefit");
      if (i.feature) add(`The ${i.product} uses ${lc(i.feature)}${verbForm ? `, so it ${lc(promise)}` : ` — ${lc(promise)}`}.${i.promise2 ? ` It also ${startsWithVerb(i.promise2) ? lc(i.promise2) : `offers this: ${lc(i.promise2)}`}.` : ""}`, "Feature + verified benefits");
      if (i.usp) add(`What makes it different: ${lc(i.usp)}.`, "USP");
      break;
    }
    case "transition": {
      if (intent === "objection") add(`So if “${objection}” was what held you back, it's worth a second look.`, "Objection");
      if (i.testimonial) add(`Don't just take our word for it. A customer told us: “${i.testimonial}”`, `Verified testimonial: ${i.testimonialSource}`);
      if (i.pricing) add(`The details, plainly: ${i.pricing}.`, "Pricing & policy on file");
      add(`If ${lc(problem)} has been the issue, the next step is simple.`, "Pain point");
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
      const fw = ctx.plan?.framework ?? "Benefit-Led";
      add(
        `${fw}: ${ctx.plan?.frameworkReason ?? "Lead with the most relevant benefit."} This email focuses on one problem (${lc(problem)}) and one promise (${lc(promise)}). ${ctx.plan?.ctaStrategy ?? ""}`,
        "Plan: framework, focus problem/promise, CTA strategy",
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
export function composeBody(sections: EmailSections): string {
  return [sections.problem, sections.benefit, sections.transition].map((s) => s.trim()).filter(Boolean).join("\n\n");
}

export function stepValue(
  step: WritingStep,
  c: { subjectLines: string[]; selectedSubject: number; previewText: string; hook: string; cta: string; rationale: string; sections: EmailSections },
): string {
  switch (step) {
    case "subject":
      return c.subjectLines[c.selectedSubject] ?? "";
    case "preview":
      return c.previewText;
    case "hook":
      return c.hook;
    case "problem":
    case "benefit":
    case "transition":
      return c.sections[step];
    case "cta":
      return c.cta;
    case "rationale":
      return c.rationale;
  }
}

/** A step is complete when it has content; subject lines need three filled options. */
export function stepComplete(step: WritingStep, c: Parameters<typeof stepValue>[1]): boolean {
  if (step === "subject") return c.subjectLines.filter((s) => s.trim()).length >= 3 && Boolean((c.subjectLines[c.selectedSubject] ?? "").trim());
  return stepValue(step, c).trim().length > 0;
}
