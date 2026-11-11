import { z } from "zod";

/**
 * AI configuration.
 * - Secrets (API keys) come ONLY from server-side environment variables.
 * - Non-secret choices (provider, model, local base URL, generation preferences) can be saved
 *   from the Settings page and override env defaults. The UI never receives key values.
 */
export const PROVIDERS = ["none", "openai", "anthropic", "openai-compatible", "ollama"] as const;
export type ProviderChoice = (typeof PROVIDERS)[number];
export type ProviderId = Exclude<ProviderChoice, "none">;

export const PROVIDER_LABELS: Record<ProviderChoice, string> = {
  none: "None (Human Mode only)",
  openai: "OpenAI API",
  anthropic: "Anthropic API",
  "openai-compatible": "OpenAI-compatible server",
  ollama: "Ollama (local)",
};

export const EMAIL_LENGTHS = ["short", "medium", "long"] as const;
export type EmailLength = (typeof EMAIL_LENGTHS)[number];
export const LENGTH_WORDS: Record<EmailLength, [number, number]> = { short: [80, 140], medium: [140, 220], long: [220, 320] };

export const OLLAMA_DEFAULT_URL = "http://127.0.0.1:11434";
export const OLLAMA_DEFAULT_MODEL = "qwen3:1.7b";

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Enter a full http(s) URL");

/** Non-secret settings saved from the UI. Empty strings mean "use the environment default". */
export const aiSettingsSchema = z.object({
  provider: z.enum(PROVIDERS).optional(),
  model: z.string().trim().max(200).default(""),
  baseUrl: httpUrl.default(""),
  temperature: z.number().min(0).max(1).nullable().default(null),
  length: z.enum(EMAIL_LENGTHS).default("medium"),
  tone: z.string().trim().max(200).default(""),
  framework: z.string().trim().max(50).default(""),
  timeoutSeconds: z.number().int().min(10).max(600).nullable().default(null),
});
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export const DEFAULT_AI_SETTINGS: AiSettings = aiSettingsSchema.parse({});

export interface GenerationPrefs {
  tone: string;
  length: EmailLength;
  framework: string;
  temperature: number | null;
}

export interface AiConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  temperature: number | null;
  inputCostPerMTok: number | null;
  outputCostPerMTok: number | null;
}

export interface AiStatus {
  available: boolean;
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
  baseUrl: string | null;
  isLocal: boolean;
  reason: string;
  costAware: boolean;
}

const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  "openai-compatible": "",
  ollama: OLLAMA_DEFAULT_MODEL,
};

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const norm = (u: string) => u.trim().replace(/\/+$/, "").toLowerCase();

/** Which env var holds the key for each provider. Exposed to the UI as names + presence only. */
export const KEY_VARS: Partial<Record<ProviderId, string>> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  "openai-compatible": "OPENAI_COMPATIBLE_API_KEY",
};

export function keyPresence(env: NodeJS.ProcessEnv = process.env): Record<string, boolean> {
  return Object.fromEntries(Object.values(KEY_VARS).map((k) => [k, Boolean(env[k!]?.trim())]));
}

export function readAiConfig(env: NodeJS.ProcessEnv = process.env, saved: Partial<AiSettings> | null = null): { config: AiConfig | null; reason: string } {
  const provider = (saved?.provider ?? env.AI_PROVIDER ?? "none").trim().toLowerCase();
  if (!provider || provider === "none") return { config: null, reason: "No AI provider is selected. Human Mode works fully; choose a provider in Settings to enable AI Mode." };
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return { config: null, reason: `Unsupported AI provider "${provider}". Use openai, anthropic, openai-compatible or ollama.` };
  }
  const p = provider as ProviderId;
  const uiBase = saved?.baseUrl?.trim() ?? "";

  let apiKey = "";
  let baseUrl = "";
  if (p === "openai") {
    apiKey = env.OPENAI_API_KEY?.trim() ?? "";
    if (!apiKey) return { config: null, reason: "OPENAI_API_KEY is not set in .env (keys are only read from the server environment)." };
    baseUrl = env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  } else if (p === "anthropic") {
    apiKey = env.ANTHROPIC_API_KEY?.trim() ?? "";
    if (!apiKey) return { config: null, reason: "ANTHROPIC_API_KEY is not set in .env (keys are only read from the server environment)." };
    baseUrl = "https://api.anthropic.com/v1";
  } else if (p === "openai-compatible") {
    const envBase = env.OPENAI_COMPATIBLE_BASE_URL?.trim() ?? "";
    baseUrl = uiBase || envBase;
    if (!baseUrl) return { config: null, reason: "Set the server URL for the OpenAI-compatible provider (Settings or OPENAI_COMPATIBLE_BASE_URL)." };
    // The env key is only sent to the env-configured host, never to a URL typed in the UI.
    if (envBase && norm(baseUrl) === norm(envBase)) apiKey = env.OPENAI_COMPATIBLE_API_KEY?.trim() ?? "";
  } else {
    baseUrl = uiBase || env.OLLAMA_BASE_URL?.trim() || OLLAMA_DEFAULT_URL;
  }

  const model = saved?.model?.trim() || env.AI_MODEL?.trim() || (p === "ollama" ? env.OLLAMA_MODEL?.trim() : "") || DEFAULT_MODELS[p];
  if (!model) return { config: null, reason: "Choose a model name in Settings (or set AI_MODEL)." };

  const envTimeout = Number(env.AI_TIMEOUT_MS);
  const defaultTimeout = p === "ollama" ? 240_000 : 90_000;
  const timeoutMs = saved?.timeoutSeconds
    ? saved.timeoutSeconds * 1000
    : Number.isFinite(envTimeout) && envTimeout >= 5_000
      ? Math.min(envTimeout, 600_000)
      : defaultTimeout;

  return {
    config: {
      provider: p,
      model,
      apiKey,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      timeoutMs,
      temperature: saved?.temperature ?? null,
      inputCostPerMTok: p === "ollama" ? 0 : num(env.AI_INPUT_COST_PER_MTOK),
      outputCostPerMTok: p === "ollama" ? 0 : num(env.AI_OUTPUT_COST_PER_MTOK),
    },
    reason: "",
  };
}

export function aiStatusFrom(result: ReturnType<typeof readAiConfig>, enabledByUser: boolean): AiStatus {
  if (!result.config) {
    return { available: false, provider: null, providerLabel: null, model: null, baseUrl: null, isLocal: false, reason: result.reason, costAware: false };
  }
  const { config } = result;
  const isLocal = config.provider === "ollama" || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(config.baseUrl);
  return {
    available: enabledByUser,
    provider: config.provider,
    providerLabel: PROVIDER_LABELS[config.provider],
    model: config.model,
    // Only show base URLs for user-configurable/local providers.
    baseUrl: config.provider === "ollama" || config.provider === "openai-compatible" ? config.baseUrl : null,
    isLocal,
    reason: enabledByUser ? "" : "AI features are turned off in Settings.",
    costAware: config.inputCostPerMTok !== null && config.outputCostPerMTok !== null,
  };
}
