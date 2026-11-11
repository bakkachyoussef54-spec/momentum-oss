import { Building2 } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader } from "@/components/common";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { listBrands } from "@/lib/services/brands";
import { toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { validateResearch } from "@/lib/research/validate";
import { db } from "@/lib/db";

export const metadata = { title: "New campaign" };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const { brand } = await searchParams;
  const brands = await listBrands();
  const research = await db.researchSource.findMany({ where: { brandId: { in: brands.map((b) => b.id) } } });
  const wizardBrands = brands.map((b) => {
    const v = validateResearch(toBrandProfile(b), research.filter((r) => r.brandId === b.id).map(toResearchItem));
    return {
      id: b.id,
      name: b.name,
      productName: b.products[0]?.name ?? "",
      targetAudience: b.products[0]?.targetAudience ?? "",
      toneOfVoice: b.toneOfVoice,
      readiness: v.readiness,
      missingRequired: v.missing.filter((m) => m.severity === "required").map((m) => m.label),
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Campaign Builder" title="Create New Campaign" description="Seven short steps. Every email in the sequence gets a distinct strategic role." />
      {brands.length === 0 ? (
        <EmptyState icon={Building2} title="Add a brand first" description="Campaigns are planned from a brand's research." action={<ButtonLink href="/brands/new">New brand</ButtonLink>} />
      ) : (
        <CampaignWizard brands={wizardBrands} initialBrandId={brands.some((b) => b.id === brand) ? brand : undefined} />
      )}
    </div>
  );
}
