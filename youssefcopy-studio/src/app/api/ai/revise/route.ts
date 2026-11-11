import { z } from "zod";
import { revisionActionSchema } from "@/lib/ai/prompts";
import { proposeRevision } from "@/lib/services/ai";
import { aiErrorResponse } from "../errors";

const bodySchema = z.object({
  emailId: z.string().min(1).max(64),
  action: revisionActionSchema,
  current: z
    .object({
      subjectLines: z.array(z.string().max(200)).max(10),
      previewText: z.string().max(300),
      hook: z.string().max(2000),
      body: z.string().max(20000),
      cta: z.string().max(200),
    })
    .optional(),
});

/** Returns a proposal only — the editor asks the user before applying it. */
export async function POST(request: Request) {
  try {
    const { emailId, action, current } = bodySchema.parse(await request.json());
    const result = await proposeRevision(emailId, action, current, request.signal);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
