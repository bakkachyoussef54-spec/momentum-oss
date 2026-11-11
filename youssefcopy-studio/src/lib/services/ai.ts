import { z } from "zod";
import { EMAIL_LENGTHS, type AiConfig, type GenerationPrefs } from "../ai/config";
import {
  buildDraftPrompt,
  buildReviewPrompt,
  buildRevisionPrompt,
  DRAFT_JSON_SCHEMA,
  draftResponseSchema,
  REVIEW_JSON_SCHEMA,
  reviewResponseSchema,
  revisionResponseSchema,
  SYSTEM_PROMPT,
  type RevisionAction,
} from "../ai/prompts";
import { AiError, complete, estimateCost, extractJson, testConnection, type CompletionResult } from "../ai/providers";
import { db } from "../db";
import { validateResearch } from "../research/validate";
import { parseBrief } from "./campaigns";
import { getEmail, replaceContent } from "./emails";
import { emailContentOf, toBrandProfile, toResearchItem } from "./mappers";
import { getGenerationPrefs, getResolvedAiConfig, isAiEnabledByUser, logActivity } from "./settings";

export interface UsageInfo {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
}

/** Per-request preference overrides sent from the editor/generator. */
export const prefsOverrideSchema = z
  .object({
    tone: z.string().trim().max(200).optional(),
    length: z.enum(EMAIL_LENGTHS).optional(),
    framework: z.string().trim().max(50).optional(),
    temperature: z.number().min(0).max(1).nullable().optional(),
  })
  .default({});

async function requireConfig(prefs: GenerationPrefs): Promise<AiConfig> {
  const { config, reason } = await getResolvedAiConfig();
  if (!config) throw new AiError(reason, "not_configured");
  if (!(await isAiEnabledByUser())) throw new AiError("AI features are turned off in Settings.", "not_configured");
  return { ...config, temperature: prefs.temperature ?? config.temperature };
}

function usageOf(config: AiConfig, result: CompletionResult): UsageInfo {
  return { model: result.model, ...result.usage, estimatedCostUsd: estimateCost(config, result.usage) };
}

function parseOrThrow<T>(schema: z.ZodType<T>, text: string, what: string): T {
  const parsed = schema.safeParse(extractJson(text));
  if (!parsed.success) throw new AiError(`The AI response did not match the expected ${what} structure. Nothing was changed — try again or pick a larger model.`, "invalid_response");
  return parsed.data;
}

/** Stage E — first draft for one email. Only runs on an explicit user action. */
export async function generateEmailDraft(
  emailId: string,
  signal?: AbortSignal,
  opts: { prefs?: Partial<GenerationPrefs>; overwriteApproved?: boolean } = {},
) {
  const prefs = await getGenerationPrefs(opts.prefs);
  const config = await requireConfig(prefs);
  const email = await getEmail(emailId);
  if (!email) throw new Error("Email not found");
  if (email.status === "approved" && !opts.overwriteApproved) {
    throw new AiError(`Email ${email.position} is approved. Confirm that you want to replace its working draft (the approved version stays in history and in exports until you re-approve).`, "approved_locked");
  }
  const campaign = email.campaign;
  const brand = toBrandProfile(campaign.brand);
  const research = campaign.brand.researchSources.map(toResearchItem);
  const validation = validateResearch(brand, research, { campaignType: campaign.type });
  if (validation.readiness === "insufficient") {
    throw new AiError(
      `Not enough research to write without inventing facts. Add: ${validation.missing.filter((m) => m.severity === "required").map((m) => m.label).join(", ")}.`,
      "insufficient_research",
    );
  }
  const brief = parseBrief(campaign.brief);
  const briefEmail = brief?.emails.find((e) => e.position === email.position);
  if (!brief || !briefEmail) throw new Error("Campaign brief is missing — refresh the brief first.");

  const result = await complete(config, {
    system: SYSTEM_PROMPT,
    user: buildDraftPrompt({ brand, research, campaign, email: briefEmail, sequence: brief.emails, prefs }),
    signal,
    jsonSchema: DRAFT_JSON_SCHEMA,
  });
  const d = parseOrThrow(draftResponseSchema, result.text, "email");
  const subjects = [...d.subjectLines.slice(0, 3)];
  while (subjects.length < 3) subjects.push("");
  await replaceContent(
    emailId,
    {
      subjectLines: subjects,
      selectedSubject: 0,
      previewText: d.previewText,
      hook: d.hook,
      body: d.body,
      cta: d.cta,
      rationale: d.rationale,
      researchRefs: d.researchRefs.length ? d.researchRefs : emailContentOf(email).researchRefs,
    },
    {
      origin: "ai",
      label: `AI-assisted draft (${result.model})`,
      aiModel: result.model,
      meta: { objective: d.objective || email.objective, segment: d.segment || email.segment, ...(opts.prefs?.framework ? { framework: opts.prefs.framework } : {}) },
      confirmApproved: true,
    },
  );
  const usage = usageOf(config, result);
  await logActivity({
    type: "ai.generated",
    message: `AI-assisted draft for email ${email.position} of ${campaign.name} (${result.model}${usage.inputTokens !== null ? `, ${usage.inputTokens}+${usage.outputTokens} tokens` : ""})`,
    entityType: "email",
    entityId: emailId,
    brandId: campaign.brandId,
  });
  return { usage, missingInformation: d.missingInformation, subjectCount: d.subjectLines.length };
}

/**
 * Stage G — targeted AI help. Returns a proposal only; the editor shows before/after and the user
 * accepts or rejects. Accepting snapshots the current draft first.
 */
export async function proposeRevision(emailId: string, action: RevisionAction, current: unknown, signal?: AbortSignal, prefsOverride: Partial<GenerationPrefs> = {}) {
  const prefs = await getGenerationPrefs(prefsOverride);
  const config = await requireConfig(prefs);
  const email = await getEmail(emailId);
  if (!email) throw new Error("Email not found");
  const working = current && typeof current === "object" ? { ...emailContentOf(email), ...(current as object) } : emailContentOf(email);
  const result = await complete(config, {
    system: SYSTEM_PROMPT,
    user: buildRevisionPrompt({
      brand: toBrandProfile(email.campaign.brand),
      research: email.campaign.brand.researchSources.map(toResearchItem),
      action,
      email: { ...(working as ReturnType<typeof emailContentOf>), objective: email.objective, framework: prefs.framework || email.framework },
      prefs,
    }),
    signal,
    maxTokens: 2000,
  });
  const proposal = parseOrThrow(revisionResponseSchema, result.text, "revision");
  const usage = usageOf(config, result);
  await logActivity({ type: "ai.revision", message: `AI suggestion “${action.replace(/_/g, " ")}” for email ${email.position} of ${email.campaign.name}`, entityType: "email", entityId: emailId, brandId: email.campaign.brandId });
  return { proposal, usage };
}

/** Optional AI editorial review. Advisory only; stored alongside heuristic analyses. */
export async function reviewWithAi(emailId: string, signal?: AbortSignal) {
  const prefs = await getGenerationPrefs();
  const config = await requireConfig(prefs);
  const email = await getEmail(emailId);
  if (!email) throw new Error("Email not found");
  const c = emailContentOf(email);
  const result = await complete(config, {
    system: SYSTEM_PROMPT,
    user: buildReviewPrompt({
      brand: toBrandProfile(email.campaign.brand),
      research: email.campaign.brand.researchSources.map(toResearchItem),
      email: { ...c, objective: email.objective, segment: email.segment },
    }),
    signal,
    maxTokens: 1500,
    jsonSchema: REVIEW_JSON_SCHEMA,
  });
  const review = parseOrThrow(reviewResponseSchema, result.text, "review");
  const total = Math.round((review.categories.reduce((s, x) => s + x.score, 0) / (review.categories.length * 10)) * 100);
  await db.copywritingAnalysis.create({
    data: {
      emailId,
      totalScore: total,
      breakdown: JSON.stringify(review.categories),
      flags: JSON.stringify(review.factualConcerns),
      improvements: JSON.stringify(review.improvements),
      method: `ai:${result.model}`.slice(0, 100),
    },
  });
  await logActivity({ type: "ai.review", message: `AI-assisted editorial review of email ${email.position} (${result.model})`, entityType: "email", entityId: emailId, brandId: email.campaign.brandId });
  return { review: { ...review, total }, usage: usageOf(config, result) };
}

export async function testAiConnection() {
  const { config, reason } = await getResolvedAiConfig();
  if (!config) return { ok: false, message: reason };
  return testConnection(config);
}
