import { z } from "zod";
import { generateEmailDraft, prefsOverrideSchema } from "@/lib/services/ai";
import { aiErrorResponse } from "../errors";

const bodySchema = z.object({
  emailId: z.string().min(1).max(64),
  prefs: prefsOverrideSchema,
  overwriteApproved: z.boolean().default(false),
});

/** User-initiated draft generation. `request.signal` aborts the provider call if the client cancels. */
export async function POST(request: Request) {
  try {
    const { emailId, prefs, overwriteApproved } = bodySchema.parse(await request.json());
    const result = await generateEmailDraft(emailId, request.signal, { prefs, overwriteApproved });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
