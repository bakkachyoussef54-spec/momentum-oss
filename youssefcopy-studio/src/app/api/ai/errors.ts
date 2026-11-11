import { z } from "zod";
import { AiError } from "@/lib/ai/providers";

export function aiErrorResponse(err: unknown) {
  if (err instanceof AiError) {
    const status = err.code === "not_configured" ? 409 : err.code === "cancelled" ? 499 : err.code === "timeout" ? 504 : err.code === "auth" ? 502 : err.code === "rate_limit" ? 429 : 502;
    return Response.json({ error: err.message, code: err.code }, { status });
  }
  if (err instanceof z.ZodError) return Response.json({ error: "Invalid request", code: "bad_request" }, { status: 400 });
  if (err instanceof Error && /not found|brief is missing/i.test(err.message)) return Response.json({ error: err.message, code: "not_found" }, { status: 404 });
  console.error("[ai]", err);
  return Response.json({ error: "Generation failed. Your draft was not changed.", code: "internal" }, { status: 500 });
}
