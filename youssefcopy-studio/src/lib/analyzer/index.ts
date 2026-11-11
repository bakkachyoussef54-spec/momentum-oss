import {
  countUrgency,
  findGenericPhrases,
  findHealthClaims,
  findNumericClaims,
} from "../compliance";
import { splitList, wordCount } from "../json";
import type { BrandProfile, ResearchItem } from "../types";

export const SCORE_DISCLAIMER =
  "Heuristic editorial assessment based on transparent writing rules. It is not a scientifically validated predictor of opens, clicks, conversions or revenue.";

export interface AnalyzableEmail {
  subjectLines: string[];
  selectedSubject: number;
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  segment?: string;
}

export interface CategoryScore {
  key: string;
  label: string;
  score: number;
  max: number;
  notes: string[];
}

export type FlagKind =
  | "unsupported_claim"
  | "repetitive_language"
  | "excessive_urgency"
  | "unclear_cta"
  | "weak_opening"
  | "missing_audience"
  | "health_claim"
  | "misleading_subject"
  | "generic_phrasing";

export interface Flag {
  kind: FlagKind;
  label: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

export interface AnalysisResult {
  totalScore: number;
  breakdown: CategoryScore[];
  flags: Flag[];
  improvements: string[];
  stats: { words: number; sentences: number; avgSentenceLength: number; readingMinutes: number };
  disclaimer: string;
}

const STOPWORDS = new Set(
  "a an the and or but of to in on for with at by from is are was were be been it its this that these those you your yours we our us i me my they them their as so if not no do does did have has had can will just than then there here what when how who which about into over more most very also".split(
    " ",
  ),
);

function keywords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w));
}

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => wordCount(s) > 0);
}

function overlapRatio(source: string[], target: Set<string>): number {
  if (source.length === 0) return 0;
  const uniq = Array.from(new Set(source));
  return uniq.filter((w) => target.has(w)).length / uniq.length;
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));

const VAGUE = ["amazing", "incredible", "best ever", "awesome", "unbelievable", "perfect", "life-changing", "insane", "world-class"];
const WEAK_OPENINGS = [/^i hope/i, /^we('| a)re (so )?(excited|thrilled|happy)/i, /^in today'?s/i, /^as you (may )?know/i, /^hi there,?$/i, /^just (checking|wanted)/i];
const ACTION_VERBS = /^(shop|get|try|start|discover|see|explore|claim|find|read|learn|choose|book|join|complete|finish|return|reply|watch|order|grab|take|meet|build|create|view|unlock|save|continue|pick|give|leave|write|share|update|stay|confirm|resume|reserve|upgrade|browse|check)\b/i;

/**
 * Stage F — Quality Review. Transparent, rule-based scoring:
 * Audience 20, Clarity 20, Benefits 20, Persuasiveness 15, CTA 10, Specificity 10, Voice 5.
 */
export function analyzeEmail(email: AnalyzableEmail, brand: BrandProfile, research: ResearchItem[] = []): AnalysisResult {
  const subject = email.subjectLines[email.selectedSubject] ?? email.subjectLines[0] ?? "";
  const fullBody = [email.hook, email.body].filter(Boolean).join("\n\n");
  const allText = [subject, email.previewText, fullBody, email.cta].join("\n");
  const words = wordCount(fullBody);
  const sentences = sentencesOf(fullBody);
  const avgSentenceLength = sentences.length ? words / sentences.length : 0;
  const lower = allText.toLowerCase();
  const p = brand.product;

  const verifiedText = research
    .filter((r) => r.status === "verified")
    .map((r) => r.content)
    .join("\n");
  const evidenceText = [p.description, p.benefits, p.features, p.usp, p.pricing, p.testimonials, verifiedText].join("\n").toLowerCase();

  const flags: Flag[] = [];
  const breakdown: CategoryScore[] = [];

  // Audience relevance (20)
  {
    const notes: string[] = [];
    const youCount = (fullBody.match(/\b(you|your|you're|yours)\b/gi) ?? []).length;
    const youDensity = words ? youCount / words : 0;
    const audienceKw = new Set(keywords([p.targetAudience, p.painPoints, p.desires].join(" ")));
    const overlap = overlapRatio(keywords(fullBody), audienceKw);
    let s = 0;
    s += Math.min(8, youDensity * 160);
    if (youDensity < 0.02) notes.push("Speak to the reader more directly (use “you”).");
    s += audienceKw.size ? Math.min(8, overlap * 60) : 4;
    if (audienceKw.size && overlap < 0.05) notes.push("The copy barely references the audience's own pains or desires.");
    if ((email.segment ?? "").trim()) s += 4;
    else notes.push("No recommended audience segment set.");
    if (!fullBody.trim()) s = 0;
    breakdown.push({ key: "audience", label: "Audience Relevance", score: clamp(s, 20), max: 20, notes });
    if (!(email.segment ?? "").trim() && audienceKw.size && overlap < 0.05 && fullBody.trim()) {
      flags.push({ kind: "missing_audience", label: "Missing audience context", severity: "medium", detail: "The email doesn't reference who it's for or their situation." });
    }
  }

  // Clarity (20)
  {
    const notes: string[] = [];
    let s = 20;
    if (!fullBody.trim()) {
      s = 0;
      notes.push("Body copy is empty.");
    } else {
      if (avgSentenceLength > 22) {
        s -= Math.min(8, (avgSentenceLength - 22) * 0.8);
        notes.push(`Average sentence length is ${avgSentenceLength.toFixed(0)} words; aim for under 20.`);
      }
      const longSentences = sentences.filter((x) => wordCount(x) > 30).length;
      if (longSentences) {
        s -= Math.min(5, longSentences * 1.5);
        notes.push(`${longSentences} sentence(s) exceed 30 words.`);
      }
      const paragraphs = fullBody.split(/\n\s*\n/).filter((x) => x.trim());
      const denseParas = paragraphs.filter((x) => wordCount(x) > 80).length;
      if (denseParas) {
        s -= Math.min(4, denseParas * 2);
        notes.push("Break up paragraphs longer than ~80 words.");
      }
      if (words > 450) {
        s -= 3;
        notes.push("Long email — consider whether every paragraph serves the single objective.");
      }
      const generic = findGenericPhrases(allText);
      if (generic.length) {
        s -= Math.min(4, generic.length * 2);
        notes.push(`Generic phrasing: ${generic.map((g) => `“${g}”`).join(", ")}.`);
        flags.push({ kind: "generic_phrasing", label: "Generic or formulaic phrasing", severity: "low", detail: generic.join(", ") });
      }
    }
    breakdown.push({ key: "clarity", label: "Clarity", score: clamp(s, 20), max: 20, notes });
  }

  // Benefits & value (20)
  {
    const notes: string[] = [];
    const benefitKw = new Set(keywords([p.benefits, p.usp, p.desires].join(" ")));
    const overlap = overlapRatio(keywords(fullBody), benefitKw);
    const benefitLanguage = (fullBody.match(/\b(so you can|so that|helps?|without|which means|that means|you'll|you will|imagine|feel|enjoy|wake)\b/gi) ?? []).length;
    let s = 0;
    s += benefitKw.size ? Math.min(10, overlap * 70) : 5;
    s += Math.min(10, benefitLanguage * 2.5);
    if (benefitKw.size && overlap < 0.05) notes.push("The email doesn't connect to the brand's verified benefits.");
    if (benefitLanguage < 2) notes.push("Translate features into outcomes (“so you can…”, “which means…”).");
    if (!fullBody.trim()) s = 0;
    breakdown.push({ key: "benefits", label: "Benefits & Value", score: clamp(s, 20), max: 20, notes });
  }

  // Persuasiveness (15)
  {
    const notes: string[] = [];
    let s = 0;
    const hook = email.hook.trim() || sentences[0] || "";
    const weakOpening = WEAK_OPENINGS.some((re) => re.test(hook));
    if (hook && !weakOpening) s += 5;
    if (weakOpening) {
      notes.push("The opening line is a warm-up rather than a hook.");
      flags.push({ kind: "weak_opening", label: "Weak opening", severity: "medium", detail: `“${hook.slice(0, 80)}” doesn't earn attention — open with the reader's problem, a specific observation or a question.` });
    } else if (!hook) {
      notes.push("Add an opening hook.");
      flags.push({ kind: "weak_opening", label: "Weak opening", severity: "medium", detail: "No opening hook." });
    }
    const objectionKw = new Set(keywords(p.objections));
    if (objectionKw.size && overlapRatio(keywords(fullBody), objectionKw) > 0.05) s += 4;
    else notes.push("Consider addressing a known objection.");
    const proofLanguage = /\b(review|customers?|said|told us|rated|returns?|guarantee|trial)\b/i.test(fullBody);
    if (proofLanguage) s += 3;
    if (/\?/.test(hook) || /\b(imagine|picture|remember)\b/i.test(fullBody)) s += 3;
    else notes.push("Invite the reader in — a question or a vivid picture.");
    if (!fullBody.trim()) s = 0;
    breakdown.push({ key: "persuasiveness", label: "Persuasiveness", score: clamp(s, 15), max: 15, notes });
  }

  // CTA quality (10)
  {
    const notes: string[] = [];
    const cta = email.cta.trim();
    let s = 0;
    if (!cta) {
      notes.push("No primary CTA.");
      flags.push({ kind: "unclear_cta", label: "Unclear CTA", severity: "high", detail: "There is no primary call to action." });
    } else {
      s += 3;
      const n = wordCount(cta);
      if (ACTION_VERBS.test(cta)) s += 3;
      else notes.push("Start the CTA with a clear action verb.");
      if (n >= 2 && n <= 7) s += 2;
      else notes.push("Keep the CTA between 2 and 7 words.");
      if (/\b(click here|submit|learn more)\b/i.test(cta)) notes.push("“Click here / Learn more” is vague; describe the outcome.");
      else s += 2;
      if (!ACTION_VERBS.test(cta) || /\b(click here|submit)\b/i.test(cta)) {
        flags.push({ kind: "unclear_cta", label: "Unclear CTA", severity: "medium", detail: `“${cta}” doesn't say what happens next.` });
      }
    }
    breakdown.push({ key: "cta", label: "CTA Quality", score: clamp(s, 10), max: 10, notes });
  }

  // Specificity (10)
  {
    const notes: string[] = [];
    const featureKw = new Set(keywords([p.features, p.name, p.description].join(" ")));
    const overlap = overlapRatio(keywords(fullBody), featureKw);
    const vague = VAGUE.filter((v) => lower.includes(v));
    let s = featureKw.size ? Math.min(7, overlap * 50) : 3;
    if (/\d/.test(fullBody)) s += 2;
    s += 1;
    s -= vague.length * 2;
    if (vague.length) notes.push(`Vague superlatives: ${vague.join(", ")}.`);
    if (featureKw.size && overlap < 0.05) notes.push("Mention concrete product details from the brief.");
    if (!fullBody.trim()) s = 0;
    breakdown.push({ key: "specificity", label: "Specificity", score: clamp(s, 10), max: 10, notes });
  }

  // Brand voice (5)
  {
    const notes: string[] = [];
    let s = 5;
    const restricted = splitList(brand.restrictions)
      .flatMap((r) => (r.match(/["“']([^"”']{2,40})["”']/g) ?? []).map((q) => q.replace(/["“”']/g, "").toLowerCase()))
      .filter((w) => lower.includes(w));
    if (restricted.length) {
      s -= 3;
      notes.push(`Uses restricted wording: ${restricted.join(", ")}.`);
    }
    const exclaims = (allText.match(/!/g) ?? []).length;
    const calmTone = /calm|premium|reassur|gentle|quiet|minimal|soft/i.test(brand.toneOfVoice);
    if (exclaims > (calmTone ? 1 : 3)) {
      s -= 2;
      notes.push(`${exclaims} exclamation marks may clash with the brand voice.`);
    }
    if (/[A-Z]{5,}/.test(allText.replace(/https?:\S+/g, ""))) {
      s -= 1;
      notes.push("Avoid ALL-CAPS words.");
    }
    breakdown.push({ key: "voice", label: "Brand Voice Consistency", score: clamp(s, 5), max: 5, notes });
  }

  // Additional flags
  for (const f of findHealthClaims(allText)) {
    flags.push({ kind: "health_claim", label: "Unsubstantiated health claim", severity: "high", detail: `${f.reason}: “${f.excerpt}”` });
  }
  const unsupportedNumbers = findNumericClaims(allText).filter((n) => !evidenceText.includes(n.toLowerCase()));
  if (unsupportedNumbers.length) {
    flags.push({
      kind: "unsupported_claim",
      label: "Unsupported factual claim",
      severity: "high",
      detail: `Figures not found in the brand profile or verified research: ${unsupportedNumbers.join(", ")}.`,
    });
  }
  if (/\b(\d+% off|free shipping|discount|sale|coupon|promo code)\b/i.test(allText) && !p.pricing.trim()) {
    flags.push({ kind: "unsupported_claim", label: "Unsupported factual claim", severity: "high", detail: "Mentions an offer or discount but no pricing/promotion details are on file." });
  }
  const urgency = countUrgency(allText);
  const hasDeadline = /\b(ends|until|deadline|expires)\b/i.test(p.pricing);
  if (urgency.length >= 3 || (urgency.length >= 1 && !hasDeadline)) {
    flags.push({
      kind: "excessive_urgency",
      label: "Excessive urgency",
      severity: urgency.length >= 3 ? "high" : "medium",
      detail: `Urgency language (${urgency.join(", ")})${hasDeadline ? " is overused" : " without a documented deadline"}.`,
    });
  }
  const repeated = repetition(fullBody);
  if (repeated.length) {
    flags.push({ kind: "repetitive_language", label: "Repetitive language", severity: "low", detail: `Repeated phrasing: ${repeated.slice(0, 4).map((r) => `“${r}”`).join(", ")}.` });
  }
  if (subject) {
    const misleading: string[] = [];
    if (/^\s*(re|fwd?):/i.test(subject)) misleading.push("fake reply/forward prefix");
    if (/[A-Z]{4,}/.test(subject)) misleading.push("all-caps words");
    if (/\b(free|% off|discount)\b/i.test(subject) && !p.pricing.trim()) misleading.push("offer not on file");
    if ((subject.match(/!/g) ?? []).length > 1) misleading.push("multiple exclamation marks");
    if (subject.length > 70) misleading.push("over 70 characters (likely truncated)");
    if (misleading.length) {
      flags.push({ kind: "misleading_subject", label: "Misleading or risky subject line", severity: misleading.some((m) => m.includes("fake") || m.includes("offer")) ? "high" : "low", detail: `“${subject}”: ${misleading.join(", ")}.` });
    }
  } else {
    flags.push({ kind: "misleading_subject", label: "Missing subject line", severity: "medium", detail: "No subject line selected." });
  }

  const totalScore = breakdown.reduce((sum, c) => sum + c.score, 0);
  return {
    totalScore,
    breakdown,
    flags,
    improvements: prioritizeImprovements(breakdown, flags),
    stats: {
      words,
      sentences: sentences.length,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      readingMinutes: Math.max(1, Math.round(words / 230)),
    },
    disclaimer: SCORE_DISCLAIMER,
  };
}

function repetition(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z']+/g) ?? [];
  const counts = new Map<string, number>();
  for (let i = 0; i + 2 < tokens.length; i++) {
    const gram = tokens.slice(i, i + 3);
    if (gram.every((t) => STOPWORDS.has(t))) continue;
    const key = gram.join(" ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const repeatedGrams = [...counts.entries()].filter(([, c]) => c >= 3).map(([k]) => k);
  const starts = new Map<string, number>();
  for (const s of sentencesOf(text)) {
    const first = s.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
    starts.set(first, (starts.get(first) ?? 0) + 1);
  }
  const repeatedStarts = [...starts.entries()].filter(([, c]) => c >= 3).map(([k]) => `${k}…`);
  return [...repeatedGrams, ...repeatedStarts];
}

const FLAG_ADVICE: Record<FlagKind, string> = {
  health_claim: "Remove or rephrase medical-style claims; describe comfort and experience instead, unless the client provides documented evidence.",
  unsupported_claim: "Back every number, offer or claim with the brand profile or verified research — or remove it.",
  unclear_cta: "Rewrite the CTA as a specific action with a clear outcome (e.g. “Find your fit”).",
  misleading_subject: "Make the subject line honest and specific to what the email delivers.",
  excessive_urgency: "Remove pressure language unless there is a real, documented deadline.",
  weak_opening: "Open with the reader's problem, a specific observation or a question instead of a warm-up line.",
  missing_audience: "Name the reader's situation in the first lines and set a recommended segment.",
  repetitive_language: "Vary repeated phrases and sentence openings.",
  generic_phrasing: "Replace generic phrases with concrete details from the brand research.",
};

const CATEGORY_ADVICE: Record<string, string> = {
  audience: "Make it about the reader: reference their specific pain or desire and use “you” more than “we”.",
  clarity: "Shorten sentences and paragraphs so each line carries one idea.",
  benefits: "Translate features into concrete outcomes drawn from the verified benefits.",
  persuasiveness: "Strengthen the hook and answer the top objection directly.",
  cta: "Use one clear, verb-led CTA that matches the email objective.",
  specificity: "Swap vague superlatives for concrete product details.",
  voice: "Align punctuation and wording with the brand tone and restrictions.",
};

function prioritizeImprovements(breakdown: CategoryScore[], flags: Flag[]): string[] {
  const out: string[] = [];
  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  const sortedFlags = [...flags].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  for (const f of sortedFlags) {
    if (f.severity === "low") continue;
    const advice = FLAG_ADVICE[f.kind];
    if (!out.includes(advice)) out.push(advice);
    if (out.length === 3) return out;
  }
  const weakest = [...breakdown].sort((a, b) => a.score / a.max - b.score / b.max);
  for (const c of weakest) {
    const advice = CATEGORY_ADVICE[c.key];
    if (advice && !out.includes(advice)) out.push(advice);
    if (out.length === 3) break;
  }
  return out;
}
