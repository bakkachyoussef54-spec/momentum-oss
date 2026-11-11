import { z } from "zod";
import { reviewWithAi } from "@/lib/services/ai";
import { aiErrorResponse } from "../errors";

const bodySchema = z.object({ emailId: z.string().min(1).max(64) });

/** Optional AI-assisted editorial review (advisory; complements the heuristic analyzer). */
export async function POST(request: Request) {
  try {
    const { emailId } = bodySchema.parse(await request.json());
    return Response.json({ ok: true, ...(await reviewWithAi(emailId, request.signal)) });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
