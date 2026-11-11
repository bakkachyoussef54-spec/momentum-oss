/**
 * Compliance helpers shared by research validation, the analyzer and AI prompt building.
 * These are conservative pattern checks for a human editor, not legal review.
 */

const DISEASE_TERMS =
  "insomnia|sleep apnea|apnea|anxiety|depression|disease|disorder|cancer|diabetes|arthritis|adhd|ptsd|migraines?|chronic pain|inflammation|infection|hypertension|obesity|illness";

const HEALTH_CLAIM_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: new RegExp(
      `\\b(cure[sd]?|curing|treat(?:s|ed|ing|ment)?|heal(?:s|ed|ing)?|prevent(?:s|ed|ing)?|reverse[sd]?|eliminat(?:e|es|ed|ing))\\b[^.!?\\n]{0,60}\\b(${DISEASE_TERMS})\\b`,
      "i",
    ),
    reason: "Implies the product treats, cures or prevents a medical condition",
  },
  {
    pattern: new RegExp(`\\b(${DISEASE_TERMS})\\b[^.!?\\n]{0,40}\\b(cured|gone for good|disappears?|fixed)\\b`, "i"),
    reason: "Implies a medical condition will be resolved",
  },
  { pattern: /\bclinically[- ](proven|tested|shown)\b/i, reason: "Clinical claim requires documented evidence" },
  { pattern: /\b(scientifically|medically) proven\b/i, reason: "Proof claim requires documented evidence" },
  { pattern: /\b(doctor|physician|dermatologist|expert)[- ](recommended|approved|endorsed)\b/i, reason: "Endorsement claim requires a verifiable source" },
  { pattern: /\bfda[- ](approved|cleared)\b/i, reason: "Regulatory claim requires verification" },
  { pattern: /\b(studies|research|science) (shows?|proves?|confirms?)\b/i, reason: "Cites research without a verified reference" },
  { pattern: /\bguaranteed (results|to work|sleep)\b/i, reason: "Guaranteed outcome claim" },
  { pattern: /\b(miracle|magic) (cure|solution|pill)\b/i, reason: "Hyperbolic health claim" },
  { pattern: /\b(no|zero) side[- ]effects\b/i, reason: "Safety claim requires evidence" },
];

export interface ClaimFinding {
  excerpt: string;
  reason: string;
}

function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + length + 20);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

export function findHealthClaims(text: string): ClaimFinding[] {
  const findings: ClaimFinding[] = [];
  for (const { pattern, reason } of HEALTH_CLAIM_PATTERNS) {
    const match = pattern.exec(text);
    if (match) findings.push({ excerpt: excerptAround(text, match.index, match[0].length), reason });
  }
  return findings;
}

/** Numeric claims (percentages, multipliers, "X hours") that must be backed by a verified source. */
export function findNumericClaims(text: string): string[] {
  const matches = text.match(/\b\d+(?:\.\d+)?\s?(?:%|percent|x\b|times\b|hours?\b|minutes?\b|nights?\b|days?\b)/gi) ?? [];
  return Array.from(new Set(matches.map((m) => m.trim())));
}

const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|any|system)\b[^.\n]{0,20}\b(instructions?|prompts?|rules?|directions?)\b/i,
  /\byou are (now|no longer)\b/i,
  /\b(system|developer) (prompt|message|instructions?)\b/i,
  /^\s*(system|assistant|user)\s*:/im,
  /<\/?\s*(system|assistant|instructions?)\s*>/i,
  /\b(reveal|print|show|output)\b[^.\n]{0,30}\b(api key|secret|prompt|instructions)\b/i,
  /\bnew instructions?\s*:/i,
  /\bjailbreak\b/i,
];

/** Detect text that looks like it is trying to instruct an AI model (prompt injection). */
export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

/**
 * Remove lines that look like instructions to the model before research is sent to an AI provider.
 * The original text is never modified in storage; this only affects the prompt copy.
 */
export function neutralizeInjection(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (detectPromptInjection(line) ? "[line withheld: looked like an instruction to an AI system]" : line))
    .join("\n");
}

export const URGENCY_PATTERNS: RegExp[] = [
  /\blast chance\b/i,
  /\b(act|order|buy|shop) now\b/i,
  /\bhurry\b/i,
  /\bonly \d+ (left|hours?|days?)\b/i,
  /\b(ends|expires) (tonight|today|soon|at midnight)\b/i,
  /\bdon'?t miss (out)?\b/i,
  /\blimited time\b/i,
  /\bbefore it'?s too late\b/i,
  /\bfinal (hours?|call|warning)\b/i,
  /\bselling (out )?fast\b/i,
  /\btoday only\b/i,
  /\bnow or never\b/i,
];

export function countUrgency(text: string): string[] {
  const hits: string[] = [];
  for (const p of URGENCY_PATTERNS) {
    const m = text.match(p);
    if (m) hits.push(m[0]);
  }
  return hits;
}

/** Phrases that read as generic AI or template copy. */
export const GENERIC_PHRASES = [
  "in today's fast-paced world",
  "look no further",
  "game-changer",
  "game changer",
  "unlock the power",
  "unlock your",
  "elevate your",
  "take it to the next level",
  "revolutionize",
  "revolutionary",
  "seamless",
  "dive into",
  "embark on a journey",
  "we're excited to announce",
  "we are excited to",
  "i hope this email finds you well",
  "say goodbye to",
  "transform your life",
  "the ultimate",
  "best-kept secret",
  "in the realm of",
  "it's no secret",
];

export function findGenericPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return GENERIC_PHRASES.filter((p) => lower.includes(p));
}
