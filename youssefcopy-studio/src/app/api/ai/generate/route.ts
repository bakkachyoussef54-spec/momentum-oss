import { z } from "zod";
import { generateEmailDraft } from "@/lib/services/ai";
import { aiErrorResponse } from "../errors";

const bodySchema = z.object({ emailId: z.string().min(1).max(64) });

/** User-initiated draft generation. `request.signal` aborts the provider call if the client cancels. */
export async function POST(request: Request) {
  try {
    const { emailId } = bodySchema.parse(await request.json());
    const usage = await generateEmailDraft(emailId, request.signal);
    return Response.json({ ok: true, usage });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
