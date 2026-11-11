import { Sparkles } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader, SectionCard } from "@/components/common";
import { QueryPicker } from "@/components/query-picker";
import { GeneratorPanel } from "@/components/generate/generator-panel";
import { ReadinessPanel } from "@/components/research/readiness-panel";
import { getCampaign, listCampaigns, parseBrief } from "@/lib/services/campaigns";
import { listTemplates } from "@/lib/services/templates";
import { getAiStatus } from "@/lib/services/settings";
import { toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { validateResearch } from "@/lib/research/validate";
import { suggestTemplateSlug } from "@/lib/templates/library";

export const metadata = { title: "AI Email Generator" };

const STAGES = ["Research validation", "Customer psychology", "Email strategy", "Campaign outline", "First draft", "Quality review", "Revision", "Final delivery"];

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign: campaignParam } = await searchParams;
  const [campaigns, ai] = await Promise.all([listCampaigns(), getAiStatus()]);
  const campaignId = campaignParam ?? (campaigns.length === 1 ? campaigns[0].id : "");
  const campaign = campaignId ? await getCampaign(campaignId) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="AI Copywriting Engine"
        title="AI Email Generator"
        description="A research-grounded pipeline. Drafts are written only from the brand profile and verified research, then reviewed by you."
        actions={campaigns.length > 0 && <QueryPicker param="campaign" label="Campaign" value={campaign?.id ?? ""} placeholder="Select a campaign…" options={campaigns.map((c) => ({ value: c.id, label: `${c.brand.name} — ${c.name}` }))} />}
      />
      <ol className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" aria-label="Pipeline stages">
        {STAGES.map((s, i) => (
          <li key={s} className="rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{String.fromCharCode(65 + i)}</p>
            <p className="text-xs font-medium leading-tight">{s}</p>
          </li>
        ))}
      </ol>
      {campaigns.length === 0 ? (
        <EmptyState icon={Sparkles} title="No campaigns to write" description="Plan a campaign first — the generator writes one email per strategic role." action={<ButtonLink href="/campaigns/new">Create New Campaign</ButtonLink>} />
      ) : !campaign ? (
        <EmptyState icon={Sparkles} title="Choose a campaign" description="Select a campaign above to generate or prepare its emails." />
      ) : (
        <Body campaign={campaign} ai={ai} />
      )}
    </div>
  );
}

async function Body({ campaign, ai }: { campaign: NonNullable<Awaited<ReturnType<typeof getCampaign>>>; ai: Awaited<ReturnType<typeof getAiStatus>> }) {
  const templates = await listTemplates();
  const bySlug = new Map(templates.map((t) => [t.slug, t]));
  const brief = parseBrief(campaign.brief);
  const validation = validateResearch(toBrandProfile(campaign.brand), campaign.brand.researchSources.map(toResearchItem), { campaignType: campaign.type });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <GeneratorPanel
        ai={{ available: ai.available, reason: ai.reason, model: ai.model, costAware: ai.costAware, provider: ai.provider } as never}
        readiness={validation.readiness}
        emails={campaign.emails.map((e) => {
          const intent = brief?.emails.find((b) => b.position === e.position)?.intent ?? "introduce";
          const t = bySlug.get(suggestTemplateSlug(campaign.type, intent));
          return { id: e.id, position: e.position, role: e.role, framework: e.framework, objective: e.objective, status: e.status, contentOrigin: e.contentOrigin, suggestedTemplate: t ? { id: t.id, name: t.name } : null };
        })}
      />
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <SectionCard title="Stage A · Research validation" actions={<ButtonLink href={`/research?brand=${campaign.brandId}`} variant="ghost" size="sm">Research</ButtonLink>}>
          <ReadinessPanel validation={validation} compact />
        </SectionCard>
      </aside>
    </div>
  );
}
