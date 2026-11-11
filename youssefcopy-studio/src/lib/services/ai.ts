import { readAiConfig } from "../ai/config";
import { buildDraftPrompt, buildRevisionPrompt, draftResponseSchema, revisionResponseSchema, SYSTEM_PROMPT, type RevisionAction } from "../ai/prompts";
import { AiError, complete, estimateCost, extractJson } from "../ai/providers";
import { db } from "../db";
import { validateResearch } from "../research/validate";
import { parseBrief } from "./campaigns";
import { emailContentOf, toBrandProfile, toResearchItem } from "./mappers";
import { isAiEnabledByUser, logActivity } from "./settings";
import { getEmail, replaceContent } from "./emails";

export interface UsageInfo {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
}

async function requireConfig() {
  const { config, reason } = readAiConfig();
  if (!config) throw new AiError(reason, "not_configured");
  if (!(await isAiEnabledByUser())) throw new AiError("AI features are turned off in Settings.", "not_configured");
  return config;
}

/** Stage E — First Draft Generation for one email. Only called from an explicit user action. */
export async function generateEmailDraft(emailId: string, signal?: AbortSignal) {
  const config = await requireConfig();
  const email = await getEmail(emailId);
  if (!email) throw new Error("Email not found");
  const campaign = email.campaign;
  const brand = toBrandProfile(campaign.brand);
  const research = campaign.brand.researchSources.map(toResearchItem);
  const validation = validateResearch(brand, research, { campaignType: campaign.type });
  if (validation.readiness === "insufficient") {
    throw new AiError(`Not enough verified research to write without inventing facts. Missing: ${validation.missing.filter((m) => m.severity === "required").map((m) => m.label).join(", ")}.`, "invalid_response");
  }
  const brief = parseBrief(campaign.brief);
  const briefEmail = brief?.emails.find((e) => e.position === email.position);
  if (!brief || !briefEmail) throw new Error("Campaign brief is missing — refresh the brief first.");

  const result = await complete(config, {
    system: SYSTEM_PROMPT,
    user: buildDraftPrompt({ brand, research, campaign, email: briefEmail, sequence: brief.emails }),
    signal,
  });
  const parsed = draftResponseSchema.safeParse(extractJson(result.text));
  if (!parsed.success) throw new AiError("The AI response did not match the expected email structure. Nothing was saved.", "invalid_response");
  const d = parsed.data;
  await replaceContent(
    emailId,
    { subjectLines: d.subjectLines.slice(0, 3), selectedSubject: 0, previewText: d.previewText, hook: d.hook, body: d.body, cta: d.cta, rationale: d.rationale, researchRefs: d.researchRefs },
    { origin: "ai", label: `AI first draft (${result.model})`, aiModel: result.model, meta: { objective: d.objective || email.objective, segment: d.segment || email.segment } },
  );
  const usage: UsageInfo = { model: result.model, ...result.usage, estimatedCostUsd: estimateCost(config, result.usage) };
  await logActivity({
    type: "ai.generated",
    message: `AI drafted email ${email.position} of ${campaign.name} with ${result.model}${usage.inputTokens !== null ? ` (${usage.inputTokens}+${usage.outputTokens} tokens)` : ""}`,
    entityType: "email",
    entityId: emailId,
    brandId: campaign.brandId,
  });
  return usage;
}

/**
 * Stage G — Revision. Returns a proposal only; the editor shows it and the user decides whether
 * to apply it (applying snapshots the current draft first).
 */
export async function proposeRevision(emailId: string, action: RevisionAction, current: unknown, signal?: AbortSignal) {
  const config = await requireConfig();
  const email = await getEmail(emailId);
  if (!email) throw new Error("Email not found");
  const working = current && typeof current === "object" ? { ...emailContentOf(email), ...(current as object) } : emailContentOf(email);
  const result = await complete(config, {
    system: SYSTEM_PROMPT,
    user: buildRevisionPrompt({
      brand: toBrandProfile(email.campaign.brand),
      research: email.campaign.brand.researchSources.map(toResearchItem),
      action,
      email: { ...(working as ReturnType<typeof emailContentOf>), objective: email.objective },
    }),
    signal,
    maxTokens: 2000,
  });
  const parsed = revisionResponseSchema.safeParse(extractJson(result.text));
  if (!parsed.success) throw new AiError("The AI revision did not match the expected structure.", "invalid_response");
  const usage: UsageInfo = { model: result.model, ...result.usage, estimatedCostUsd: estimateCost(config, result.usage) };
  await logActivity({ type: "ai.revision", message: `AI suggested “${action.replace(/_/g, " ")}” for email ${email.position} of ${email.campaign.name}`, entityType: "email", entityId: emailId, brandId: email.campaign.brandId });
  return { proposal: parsed.data, usage };
}

export async function countPendingAiUsage() {
  return db.activityLog.count({ where: { type: { startsWith: "ai." } } });
}
