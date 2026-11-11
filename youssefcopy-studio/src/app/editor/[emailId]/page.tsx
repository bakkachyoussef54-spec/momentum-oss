import { notFound } from "next/navigation";
import { EmailEditor } from "@/components/editor/email-editor";
import { getEmail } from "@/lib/services/emails";
import { emailContentOf, toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { listTemplates } from "@/lib/services/templates";
import { getAiStatus } from "@/lib/services/settings";
import { parseStringArray } from "@/lib/json";

export default async function EditorPage({ params }: { params: Promise<{ emailId: string }> }) {
  const { emailId } = await params;
  const [email, templates, ai] = await Promise.all([getEmail(emailId), listTemplates(), getAiStatus()]);
  if (!email) notFound();
  const c = email.campaign;
  return (
    <EmailEditor
      // Remount when content changes server-side (restore, template, AI apply) so state reloads.
      key={`${email.id}-${email.updatedAt.toISOString()}-${email.versions.length}`}
      email={{
        id: email.id,
        position: email.position,
        role: email.role,
        objective: email.objective,
        framework: email.framework,
        segment: email.segment,
        status: email.status,
        contentOrigin: email.contentOrigin,
        content: emailContentOf(email),
      }}
      campaign={{ id: c.id, name: c.name, goal: c.goal, audience: c.audience, tone: c.tone }}
      sequence={c.emails}
      versions={email.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        origin: v.origin,
        label: v.label,
        createdAt: v.createdAt.toISOString(),
        subject: parseStringArray(v.subjectLines)[v.selectedSubject] ?? "",
        aiModel: v.aiModel,
      }))}
      brand={toBrandProfile(c.brand)}
      research={c.brand.researchSources.map(toResearchItem)}
      templates={templates.map((t) => ({ id: t.id, name: t.name, category: t.category, framework: t.framework }))}
      ai={{ available: ai.available, reason: ai.reason, model: ai.model }}
    />
  );
}
