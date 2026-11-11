import { z } from "zod";
import { TEMPLATE_CATEGORIES } from "../constants";
import { db } from "../db";
import { BUILT_IN_TEMPLATES } from "../templates/library";
import { logActivity } from "./settings";

/** Seeds built-in templates idempotently (upsert by slug), without touching custom ones. */
export async function ensureBuiltInTemplates() {
  const existing = await db.template.findMany({ where: { isBuiltIn: true }, select: { slug: true } });
  const have = new Set(existing.map((t) => t.slug));
  const missing = BUILT_IN_TEMPLATES.filter((t) => !have.has(t.slug));
  for (const t of missing) {
    await db.template.create({
      data: {
        ...t,
        outline: JSON.stringify(t.outline),
        subjectLines: JSON.stringify(t.subjectLines),
        isBuiltIn: true,
      },
    });
  }
}

export async function listTemplates() {
  await ensureBuiltInTemplates();
  return db.template.findMany({ orderBy: [{ isBuiltIn: "desc" }, { category: "asc" }, { name: "asc" }] });
}

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: z.enum(TEMPLATE_CATEGORIES),
  goal: z.string().trim().max(1000).default(""),
  framework: z.string().trim().max(50).default(""),
  outline: z.array(z.string().trim().max(300)).max(12).default([]),
  subjectLines: z.array(z.string().trim().max(150)).max(5).default([]),
  previewText: z.string().trim().max(200).default(""),
  hook: z.string().trim().max(1000).default(""),
  body: z.string().trim().max(10000).default(""),
  cta: z.string().trim().max(100).default(""),
  personalization: z.string().trim().max(2000).default(""),
});

export async function createTemplate(raw: unknown) {
  const t = templateInputSchema.parse(raw);
  const slug = `custom-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`;
  const created = await db.template.create({
    data: { ...t, slug, outline: JSON.stringify(t.outline), subjectLines: JSON.stringify(t.subjectLines), isBuiltIn: false },
  });
  await logActivity({ type: "template.created", message: `Saved template ${created.name}`, entityType: "template", entityId: created.id });
  return created;
}

export async function deleteTemplate(id: string) {
  const t = await db.template.findUniqueOrThrow({ where: { id } });
  if (t.isBuiltIn) throw new Error("Built-in templates cannot be deleted");
  await db.template.delete({ where: { id } });
}
