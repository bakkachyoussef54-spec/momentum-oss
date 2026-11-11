import { Microscope } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader, SectionCard } from "@/components/common";
import { QueryPicker } from "@/components/query-picker";
import { ReadinessPanel } from "@/components/research/readiness-panel";
import { ResearchManager } from "@/components/research/research-manager";
import { getBrand, listBrands } from "@/lib/services/brands";
import { toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { analyzePsychology, validateResearch } from "@/lib/research/validate";

export const metadata = { title: "Brand Research" };

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const { brand: brandParam } = await searchParams;
  const brands = await listBrands();
  const brandId = brandParam ?? (brands.length === 1 ? brands[0].id : "");
  const brand = brandId ? await getBrand(brandId) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Research validation"
        title="Brand Research"
        description="Store sources, separate verified facts from hypotheses, and see exactly what's missing before you write."
        actions={brands.length > 0 && <QueryPicker param="brand" label="Brand" value={brand?.id ?? ""} placeholder="Select a brand…" options={brands.map((b) => ({ value: b.id, label: b.name }))} />}
      />
      {brands.length === 0 ? (
        <EmptyState icon={Microscope} title="Create a brand first" description="Research is stored per brand." action={<ButtonLink href="/brands/new">New brand</ButtonLink>} />
      ) : !brand ? (
        <EmptyState icon={Microscope} title="Choose a brand" description="Select a brand above to manage its research library." />
      ) : (
        <ResearchBody brand={brand} />
      )}
    </div>
  );
}

function ResearchBody({ brand }: { brand: NonNullable<Awaited<ReturnType<typeof getBrand>>> }) {
  const profile = toBrandProfile(brand);
  const research = brand.researchSources.map(toResearchItem);
  const validation = validateResearch(profile, research);
  const psych = analyzePsychology(profile, research);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <ResearchManager
        brandId={brand.id}
        items={brand.researchSources.map((r) => ({ id: r.id, title: r.title, url: r.url, kind: r.kind, category: r.category, content: r.content, status: r.status, flagged: r.flags !== "[]" }))}
      />
      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <SectionCard title="Stage A · Research validation" actions={<ButtonLink href={`/brands/${brand.id}`} variant="ghost" size="sm">Edit profile</ButtonLink>}>
          <ReadinessPanel validation={validation} />
        </SectionCard>
        <SectionCard title="Stage B · Customer psychology" description="Extracted from the profile and verified research only.">
          <dl className="space-y-3 text-sm">
            {[
              ["Primary problem", psych.primaryProblem],
              ["Primary desire", psych.primaryDesire],
              ["Top objection", psych.topObjection],
              ["Lead benefit", psych.benefits[0] ?? ""],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className={v ? "" : "italic text-muted-foreground"}>{v || "Not provided"}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Social proof</dt>
              <dd>{psych.proofAvailable ? "Verified reviews available" : "None verified — drafts won't use social proof"}</dd>
            </div>
          </dl>
        </SectionCard>
      </aside>
    </div>
  );
}
