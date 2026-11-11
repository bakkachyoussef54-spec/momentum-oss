import { z } from "zod";
import { AiError } from "@/lib/ai/providers";

const STATUS: Record<string, number> = {
  not_configured: 409,
  approved_locked: 409,
  insufficient_research: 422,
  cancelled: 499,
  timeout: 504,
  auth: 502,
  rate_limit: 429,
  unreachable: 503,
  model_missing: 424,
  invalid_response: 502,
  provider: 502,
};

export function aiErrorResponse(err: unknown) {
  if (err instanceof AiError) return Response.json({ error: err.message, code: err.code }, { status: STATUS[err.code] ?? 502 });
  if (err instanceof z.ZodError) return Response.json({ error: "Invalid request", code: "bad_request" }, { status: 400 });
  if (err instanceof Error && /not found|brief is missing/i.test(err.message)) return Response.json({ error: err.message, code: "not_found" }, { status: 404 });
  console.error("[ai]", err);
  return Response.json({ error: "Generation failed. Your draft was not changed.", code: "internal" }, { status: 500 });
}
