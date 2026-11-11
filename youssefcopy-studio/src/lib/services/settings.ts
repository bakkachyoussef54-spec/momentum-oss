import { db } from "../db";
import { aiSettingsSchema, aiStatusFrom, DEFAULT_AI_SETTINGS, readAiConfig, type AiSettings, type AiStatus, type GenerationPrefs } from "../ai/config";
import { parseJson } from "../json";

export async function logActivity(input: { type: string; message: string; entityType?: string; entityId?: string; brandId?: string | null }) {
  await db.activityLog.create({
    data: {
      type: input.type,
      message: input.message.slice(0, 500),
      entityType: input.entityType ?? "",
      entityId: input.entityId ?? "",
      brandId: input.brandId ?? null,
    },
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function isAiEnabledByUser(): Promise<boolean> {
  return (await getSetting("aiEnabled")) !== "false";
}

const AI_SETTINGS_KEY = "ai.settings";

/** Non-secret AI choices saved from Settings (provider, model, local URL, preferences). */
export async function getAiSettings(): Promise<AiSettings> {
  return parseJson(await getSetting(AI_SETTINGS_KEY), aiSettingsSchema, DEFAULT_AI_SETTINGS);
}

export async function saveAiSettings(raw: unknown): Promise<AiSettings> {
  const parsed = aiSettingsSchema.parse(raw);
  await setSetting(AI_SETTINGS_KEY, JSON.stringify(parsed));
  await logActivity({ type: "settings.ai", message: `AI settings saved (${parsed.provider ?? "env default"}${parsed.model ? ` · ${parsed.model}` : ""})` });
  return parsed;
}

export async function getResolvedAiConfig() {
  return readAiConfig(process.env, await getAiSettings());
}

export async function getGenerationPrefs(overrides: Partial<GenerationPrefs> = {}): Promise<GenerationPrefs> {
  const s = await getAiSettings();
  return {
    tone: overrides.tone ?? s.tone,
    length: overrides.length ?? s.length,
    framework: overrides.framework ?? s.framework,
    temperature: overrides.temperature !== undefined ? overrides.temperature : s.temperature,
  };
}

export async function getAiStatus(): Promise<AiStatus> {
  return aiStatusFrom(await getResolvedAiConfig(), await isAiEnabledByUser());
}
