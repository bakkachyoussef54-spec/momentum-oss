import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { ButtonLink, DemoBadge, EmptyState, PageHeader, timeAgo } from "@/components/common";
import { listBrands } from "@/lib/services/brands";
import { validateResearch } from "@/lib/research/validate";
import { toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { db } from "@/lib/db";

export const metadata = { title: "Brands" };

export default async function BrandsPage() {
  const brands = await listBrands();
  const research = await db.researchSource.findMany({ where: { brandId: { in: brands.map((b) => b.id) } } });
  const readiness = new Map(
    brands.map((b) => [b.id, validateResearch(toBrandProfile(b), research.filter((r) => r.brandId === b.id).map(toResearchItem)).readiness]),
  );
  const tone = { ready: "bg-success", partial: "bg-warning", insufficient: "bg-destructive" } as const;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Brand Knowledge Hub"
        title="Brands"
        description="Client profiles with product facts, customer psychology and voice — the source of truth for every email."
        actions={
          <ButtonLink href="/brands/new">
            <Plus /> New brand
          </ButtonLink>
        }
      />
      {brands.length === 0 ? (
        <EmptyState icon={Building2} title="No brands yet" description="Start with a client profile. Paste their brief or fill the fields manually." action={<ButtonLink href="/brands/new">Create a brand</ButtonLink>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => {
            const p = b.products[0];
            const r = readiness.get(b.id) ?? "insufficient";
            return (
              <Link
                key={b.id}
                href={`/brands/${b.id}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 outline-none transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 font-display text-primary">{b.name.slice(0, 1).toUpperCase()}</div>
                  {b.isDemo && <DemoBadge />}
                </div>
                <h2 className="mt-4 font-display text-lg leading-tight">{b.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p?.name ? `${p.name}${p.category ? ` · ${p.category}` : ""}` : "No product details yet"}</p>
                <div className="mt-auto flex items-center gap-3 pt-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${tone[r]}`} /> {r === "ready" ? "Research ready" : r === "partial" ? "Partially ready" : "Needs research"}
                  </span>
                  <span>·</span>
                  <span>{b._count.campaigns} campaigns</span>
                  <span className="ml-auto">{timeAgo(b.updatedAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
