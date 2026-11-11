/**
 * AI configuration comes only from server-side environment variables.
 * Keys are never sent to the browser; the UI receives `AiStatus` only.
 */
export type ProviderId = "openai" | "anthropic" | "openai-compatible";

export interface AiConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  inputCostPerMTok: number | null;
  outputCostPerMTok: number | null;
}

export interface AiStatus {
  available: boolean;
  provider: string | null;
  model: string | null;
  reason: string;
  costAware: boolean;
}

const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  "openai-compatible": "",
};

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function readAiConfig(env: NodeJS.ProcessEnv = process.env): { config: AiConfig | null; reason: string } {
  const provider = (env.AI_PROVIDER ?? "none").trim().toLowerCase();
  if (!provider || provider === "none") return { config: null, reason: "AI_PROVIDER is not set. Live AI generation is disabled." };
  if (provider !== "openai" && provider !== "anthropic" && provider !== "openai-compatible") {
    return { config: null, reason: `Unsupported AI_PROVIDER "${provider}". Use openai, anthropic or openai-compatible.` };
  }
  const apiKey =
    provider === "openai" ? env.OPENAI_API_KEY : provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_COMPATIBLE_API_KEY ?? "";
  if (provider !== "openai-compatible" && !apiKey?.trim()) {
    return { config: null, reason: `${provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} is not set.` };
  }
  const baseUrl =
    provider === "openai"
      ? env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
      : provider === "anthropic"
        ? "https://api.anthropic.com/v1"
        : env.OPENAI_COMPATIBLE_BASE_URL?.trim() ?? "";
  if (provider === "openai-compatible" && !baseUrl) {
    return { config: null, reason: "OPENAI_COMPATIBLE_BASE_URL is not set." };
  }
  const model = env.AI_MODEL?.trim() || DEFAULT_MODELS[provider];
  if (!model) return { config: null, reason: "AI_MODEL is required for the openai-compatible provider." };
  const timeout = Number(env.AI_TIMEOUT_MS);
  return {
    config: {
      provider,
      model,
      apiKey: apiKey?.trim() ?? "",
      baseUrl: baseUrl.replace(/\/$/, ""),
      timeoutMs: Number.isFinite(timeout) && timeout >= 5_000 ? Math.min(timeout, 300_000) : 90_000,
      inputCostPerMTok: num(env.AI_INPUT_COST_PER_MTOK),
      outputCostPerMTok: num(env.AI_OUTPUT_COST_PER_MTOK),
    },
    reason: "",
  };
}

export function aiStatusFrom(result: ReturnType<typeof readAiConfig>, enabledByUser: boolean): AiStatus {
  if (!result.config) return { available: false, provider: null, model: null, reason: result.reason, costAware: false };
  const { config } = result;
  return {
    available: enabledByUser,
    provider: config.provider,
    model: config.model,
    reason: enabledByUser ? "" : "AI features are turned off in Settings.",
    costAware: config.inputCostPerMTok !== null && config.outputCostPerMTok !== null,
  };
}
