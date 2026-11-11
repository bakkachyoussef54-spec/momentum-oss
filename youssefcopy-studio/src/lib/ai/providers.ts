import type { AiConfig } from "./config";

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  model: string;
  usage: { inputTokens: number | null; outputTokens: number | null };
}

export class AiError extends Error {
  constructor(
    message: string,
    public readonly code: "timeout" | "cancelled" | "auth" | "rate_limit" | "provider" | "invalid_response" | "not_configured",
  ) {
    super(message);
    this.name = "AiError";
  }
}

type FetchLike = typeof fetch;

function statusError(status: number, provider: string): AiError {
  if (status === 401 || status === 403) return new AiError(`${provider} rejected the API key (HTTP ${status}). Check your credentials.`, "auth");
  if (status === 429) return new AiError(`${provider} rate limit or quota reached (HTTP 429). Try again later.`, "rate_limit");
  return new AiError(`${provider} returned an error (HTTP ${status}).`, "provider");
}

/**
 * Calls exactly the configured provider — there is deliberately no fallback to another
 * (possibly paid) provider. Combines the caller's AbortSignal with a timeout.
 */
export async function complete(config: AiConfig, req: CompletionRequest, fetchImpl: FetchLike = fetch): Promise<CompletionResult> {
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
  const maxTokens = req.maxTokens ?? 2500;

  let res: Response;
  try {
    if (config.provider === "anthropic") {
      res = await fetchImpl(`${config.baseUrl}/messages`, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens,
          system: req.system,
          messages: [{ role: "user", content: req.user }],
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
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
        }),
      });
    }
  } catch (err) {
    if (req.signal?.aborted) throw new AiError("Generation cancelled.", "cancelled");
    if (timeout.aborted) throw new AiError(`The AI provider did not respond within ${Math.round(config.timeoutMs / 1000)}s.`, "timeout");
    throw new AiError(`Could not reach the AI provider: ${err instanceof Error ? err.message : "network error"}`, "provider");
  }

  if (!res.ok) throw statusError(res.status, config.provider);

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
  const d = data as { choices?: { message?: { content?: string } }[]; model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return {
    text: d.choices?.[0]?.message?.content ?? "",
    model: d.model ?? config.model,
    usage: { inputTokens: d.usage?.prompt_tokens ?? null, outputTokens: d.usage?.completion_tokens ?? null },
  };
}

/** Extract the first JSON object from model text (tolerates ```json fences). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
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
