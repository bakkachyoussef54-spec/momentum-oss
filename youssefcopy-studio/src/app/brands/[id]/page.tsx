import { notFound } from "next/navigation";
import Link from "next/link";
import { Microscope, Plus } from "lucide-react";
import { ButtonLink, DemoBadge, PageHeader, SectionCard, StatusBadge } from "@/components/common";
import { BrandForm } from "@/components/brands/brand-form";
import { DangerZone } from "@/components/danger-zone";
import { ReadinessPanel } from "@/components/research/readiness-panel";
import { archiveBrandAction, deleteBrandAction } from "@/app/actions";
import { getBrand } from "@/lib/services/brands";
import { toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { validateResearch } from "@/lib/research/validate";
import { CAMPAIGN_TYPE_LABELS, type CampaignType } from "@/lib/constants";
import { EMPTY_PRODUCT } from "@/lib/types";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await getBrand(id);
  if (!brand) notFound();
  const profile = toBrandProfile(brand);
  const validation = validateResearch(profile, brand.researchSources.map(toResearchItem));
  const p = brand.products[0];
  const initial = {
    name: brand.name,
    website: brand.website,
    instagramUrl: brand.instagramUrl,
    toneOfVoice: brand.toneOfVoice,
    competitors: brand.competitors,
    restrictions: brand.restrictions,
    researchNotes: brand.researchNotes,
    product: p
      ? { name: p.name, category: p.category, description: p.description, targetAudience: p.targetAudience, painPoints: p.painPoints, desires: p.desires, features: p.features, benefits: p.benefits, usp: p.usp, testimonials: p.testimonials, objections: p.objections, pricing: p.pricing, links: p.links }
      : { ...EMPTY_PRODUCT },
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Brand profile"
        title={brand.name}
        description={
          <span className="flex items-center gap-2">
            {brand.isDemo && <DemoBadge />}
            {brand.archivedAt ? "Archived — restore it below to use it in new campaigns." : "Edit facts, voice and restrictions. Changes are used the next time you plan or write."}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/research?brand=${brand.id}`} variant="outline">
              <Microscope /> Research ({brand.researchSources.length})
            </ButtonLink>
            <ButtonLink href={`/campaigns/new?brand=${brand.id}`}>
              <Plus /> New campaign
            </ButtonLink>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <BrandForm brandId={brand.id} initial={initial} />
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <SectionCard title="Research validation">
            <ReadinessPanel validation={validation} compact />
          </SectionCard>
          <SectionCard title="Campaigns">
            {brand.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns for this brand yet.</p>
            ) : (
              <ul className="space-y-2">
                {brand.campaigns.map((c) => (
                  <li key={c.id}>
                    <Link href={`/campaigns/${c.id}`} className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">{CAMPAIGN_TYPE_LABELS[c.type as CampaignType]}</span>
                      </span>
                      <StatusBadge kind="campaign" status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <DangerZone
            entity="brand"
            name={brand.name}
            archived={Boolean(brand.archivedAt)}
            onArchive={archiveBrandAction.bind(null, brand.id)}
            onDelete={deleteBrandAction.bind(null, brand.id)}
            redirectTo="/brands"
            consequences="All research, campaigns, email drafts and version history for this brand will be deleted."
          />
        </aside>
      </div>
    </div>
  );
}
