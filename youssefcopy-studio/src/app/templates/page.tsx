import { PageHeader } from "@/components/common";
import { TemplatesBrowser } from "@/components/templates/templates-browser";
import { listTemplates } from "@/lib/services/templates";
import { db } from "@/lib/db";
import { parseStringArray } from "@/lib/json";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const [templates, emails] = await Promise.all([
    listTemplates(),
    db.campaignEmail.findMany({
      where: { campaign: { archivedAt: null, brand: { archivedAt: null } } },
      orderBy: [{ campaign: { updatedAt: "desc" } }, { position: "asc" }],
      include: { campaign: { select: { name: true, brand: { select: { name: true } } } } },
    }),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Templates Library" title="Templates" description="Original, reusable starting points — each with a goal, framework, outline, placeholder example and personalization guidance." />
      <TemplatesBrowser
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          goal: t.goal,
          framework: t.framework,
          outline: parseStringArray(t.outline),
          subjectLines: parseStringArray(t.subjectLines),
          previewText: t.previewText,
          hook: t.hook,
          body: t.body,
          cta: t.cta,
          personalization: t.personalization,
          isBuiltIn: t.isBuiltIn,
        }))}
        targets={emails.map((e) => ({ id: e.id, label: `${e.campaign.brand.name} · ${e.campaign.name} · #${e.position} ${e.role}`, hasContent: e.contentOrigin !== "empty" }))}
      />
    </div>
  );
}
