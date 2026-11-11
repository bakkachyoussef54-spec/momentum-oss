import type { AiConfig } from "./config";

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
  signal?: AbortSignal;
  /** JSON Schema for the expected output. Used natively by Ollama; others use JSON mode + Zod validation. */
  jsonSchema?: object;
}

export interface CompletionResult {
  text: string;
  model: string;
  usage: { inputTokens: number | null; outputTokens: number | null };
}

export type AiErrorCode =
  | "timeout"
  | "cancelled"
  | "auth"
  | "rate_limit"
  | "provider"
  | "invalid_response"
  | "not_configured"
  | "unreachable"
  | "model_missing"
  | "insufficient_research"
  | "approved_locked";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly code: AiErrorCode,
  ) {
    super(message);
    this.name = "AiError";
  }
}

type FetchLike = typeof fetch;

function ollamaUnreachable(baseUrl: string) {
  return new AiError(
    `Ollama is not reachable at ${baseUrl}. Install it from https://ollama.com/download, make sure it is running (open the Ollama app or run "ollama serve"), then try again. Human Mode keeps working without it.`,
    "unreachable",
  );
}

function ollamaModelMissing(model: string) {
  return new AiError(`The Ollama model "${model}" is not installed. Run: ollama pull ${model}`, "model_missing");
}

async function statusError(res: Response, config: AiConfig): Promise<AiError> {
  const status = res.status;
  let detail = "";
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    /* ignore */
  }
  if (config.provider === "ollama") {
    if (status === 404 || /not found|pull/i.test(detail)) return ollamaModelMissing(config.model);
    return new AiError(`Ollama returned an error (HTTP ${status})${detail ? `: ${detail.replace(/[{}"]/g, "").slice(0, 160)}` : ""}.`, "provider");
  }
  if (status === 401 || status === 403) return new AiError(`${config.provider} rejected the API key (HTTP ${status}). Check the key in your .env file.`, "auth");
  if (status === 429) return new AiError(`${config.provider} rate limit or quota reached (HTTP 429). Try again later.`, "rate_limit");
  if (status === 404 && /model/i.test(detail)) return new AiError(`Model "${config.model}" was not found by ${config.provider}. Check the model name in Settings.`, "model_missing");
  return new AiError(`${config.provider} returned an error (HTTP ${status}).`, "provider");
}

function networkError(err: unknown, config: AiConfig, req: { signal?: AbortSignal }, timeout: AbortSignal): AiError {
  if (req.signal?.aborted) return new AiError("Generation cancelled.", "cancelled");
  if (timeout.aborted) {
    return new AiError(
      `The AI provider did not respond within ${Math.round(config.timeoutMs / 1000)}s.${config.provider === "ollama" ? " Small local models on CPU can be slow — try a shorter email length or raise the timeout in Settings." : ""}`,
      "timeout",
    );
  }
  if (config.provider === "ollama") return ollamaUnreachable(config.baseUrl);
  return new AiError(`Could not reach the AI provider: ${err instanceof Error ? err.message : "network error"}`, "unreachable");
}

/**
 * Calls exactly the configured provider — there is deliberately no fallback to another
 * (possibly paid) provider. Combines the caller's AbortSignal with a timeout.
 */
export async function complete(config: AiConfig, req: CompletionRequest, fetchImpl: FetchLike = fetch): Promise<CompletionResult> {
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
  const maxTokens = req.maxTokens ?? 2500;
  const temperature = config.temperature ?? undefined;

  let res: Response;
  try {
    if (config.provider === "anthropic") {
      res = await fetchImpl(`${config.baseUrl}/messages`, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens,
          system: req.system,
          messages: [{ role: "user", content: req.user }],
          ...(temperature !== undefined ? { temperature } : {}),
        }),
      });
    } else if (config.provider === "ollama") {
      res = await fetchImpl(`${config.baseUrl}/api/chat`, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          think: false,
          format: req.jsonSchema ?? "json",
          options: { num_predict: maxTokens, num_ctx: 8192, ...(temperature !== undefined ? { temperature } : {}) },
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
        }),
      });
    } else {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
      res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        signal,
        headers,
        body: JSON.stringify({
          model: config.model,
          max_completion_tokens: maxTokens,
          response_format: { type: "json_object" },
          ...(temperature !== undefined ? { temperature } : {}),
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
        }),
      });
    }
  } catch (err) {
    throw networkError(err, config, req, timeout);
  }

  if (!res.ok) throw await statusError(res, config);

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new AiError("The AI provider returned a response that was not JSON.", "invalid_response");
  }

  if (config.provider === "anthropic") {
    const d = data as { content?: { type: string; text?: string }[]; model?: string; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = (d.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    return { text, model: d.model ?? config.model, usage: { inputTokens: d.usage?.input_tokens ?? null, outputTokens: d.usage?.output_tokens ?? null } };
  }
  if (config.provider === "ollama") {
    const d = data as { message?: { content?: string }; model?: string; prompt_eval_count?: number; eval_count?: number; error?: string };
    if (d.error) throw new AiError(`Ollama error: ${d.error.slice(0, 200)}`, "provider");
    return { text: d.message?.content ?? "", model: d.model ?? config.model, usage: { inputTokens: d.prompt_eval_count ?? null, outputTokens: d.eval_count ?? null } };
  }
  const d = data as { choices?: { message?: { content?: string } }[]; model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return {
    text: d.choices?.[0]?.message?.content ?? "",
    model: d.model ?? config.model,
    usage: { inputTokens: d.usage?.prompt_tokens ?? null, outputTokens: d.usage?.completion_tokens ?? null },
  };
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  version?: string;
  models?: string[];
  modelAvailable?: boolean;
}

/**
 * Checks connectivity WITHOUT generating text (no tokens spent): lists models on the provider.
 */
export async function testConnection(config: AiConfig, fetchImpl: FetchLike = fetch): Promise<ConnectionTestResult> {
  const signal = AbortSignal.timeout(Math.min(config.timeoutMs, 15_000));
  try {
    if (config.provider === "ollama") {
      const v = await fetchImpl(`${config.baseUrl}/api/version`, { signal });
      if (!v.ok) return { ok: false, message: `Something answered at ${config.baseUrl}, but it doesn't look like Ollama (HTTP ${v.status}).` };
      const version = ((await v.json()) as { version?: string }).version;
      const t = await fetchImpl(`${config.baseUrl}/api/tags`, { signal });
      const models = t.ok ? (((await t.json()) as { models?: { name: string }[] }).models ?? []).map((m) => m.name) : [];
      const wanted = config.model.includes(":") ? config.model : `${config.model}:latest`;
      const modelAvailable = models.includes(config.model) || models.includes(wanted);
      return {
        ok: modelAvailable,
        version,
        models,
        modelAvailable,
        message: modelAvailable
          ? `Connected to Ollama ${version ?? ""} — model "${config.model}" is installed.`
          : `Connected to Ollama ${version ?? ""}, but "${config.model}" is not installed. Run: ollama pull ${config.model}${models.length ? ` (installed: ${models.slice(0, 6).join(", ")})` : ""}`,
      };
    }
    const url = `${config.baseUrl}/models`;
    const headers: Record<string, string> =
      config.provider === "anthropic"
        ? { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
        : config.apiKey
          ? { authorization: `Bearer ${config.apiKey}` }
          : {};
    const res = await fetchImpl(url, { headers, signal });
    if (!res.ok) {
      const err = await statusError(res, config);
      return { ok: false, message: err.message };
    }
    const body = (await res.json()) as { data?: { id: string }[] };
    const models = (body.data ?? []).map((m) => m.id);
    const modelAvailable = models.length === 0 ? undefined : models.includes(config.model);
    return {
      ok: modelAvailable !== false,
      models: models.slice(0, 50),
      modelAvailable,
      message:
        modelAvailable === false
          ? `Connected, but model "${config.model}" is not in this account's model list.`
          : `Connected to ${config.provider}${modelAvailable ? ` — model "${config.model}" is available` : ""}.`,
    };
  } catch (err) {
    if (config.provider === "ollama") return { ok: false, message: ollamaUnreachable(config.baseUrl).message };
    return { ok: false, message: `Could not reach ${config.baseUrl}: ${err instanceof Error ? err.message : "network error"}` };
  }
}

/** Extract the first JSON object from model text (tolerates ```json fences and <think> blocks). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : cleaned;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new AiError("The AI response did not contain a JSON object.", "invalid_response");
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new AiError("The AI response contained malformed JSON.", "invalid_response");
  }
}

export function estimateCost(config: AiConfig, usage: CompletionResult["usage"]): number | null {
  if (config.inputCostPerMTok === null || config.outputCostPerMTok === null) return null;
  if (usage.inputTokens === null || usage.outputTokens === null) return null;
  return (usage.inputTokens * config.inputCostPerMTok + usage.outputTokens * config.outputCostPerMTok) / 1_000_000;
}
