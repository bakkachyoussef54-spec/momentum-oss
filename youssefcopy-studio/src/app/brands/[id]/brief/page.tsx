import { notFound } from "next/navigation";
import { ExternalLink, FileText, Microscope, PenLine, ShieldCheck, TriangleAlert } from "lucide-react";
import { ButtonLink, PageHeader, SectionCard } from "@/components/common";
import { PlanCampaignButton } from "@/components/campaigns/plan-campaign-button";
import { WorkflowBar } from "@/components/workflow/workflow-bar";
import { getBrand } from "@/lib/services/brands";
import { toBrandProfile, toResearchItem } from "@/lib/services/mappers";
import { getWorkflow } from "@/lib/services/workflow";
import { buildStructuredBrief, type EvidenceRef } from "@/lib/research/structured-brief";
import { RESEARCH_CATEGORY_LABELS, type ResearchCategory } from "@/lib/constants";

export const metadata = { title: "Structured brief" };

function List({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>
  ) : (
    <p className="text-sm italic text-muted-foreground">{empty}</p>
  );
}

function Evidence({ items }: { items: EvidenceRef[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((e) => (
        <li key={`${e.title}-${e.url}`}>
          {e.title} <span className="text-xs text-muted-foreground">· {RESEARCH_CATEGORY_LABELS[e.category as ResearchCategory] ?? e.category}</span>
          {e.url && (
            <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 inline-flex items-center text-primary hover:underline">
              <ExternalLink className="size-3" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function StructuredBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await getBrand(id);
  if (!brand) notFound();
  const b = buildStructuredBrief(toBrandProfile(brand), brand.researchSources.map(toResearchItem));
  const workflow = await getWorkflow({ brandId: brand.id });
  const done = b.completeness.filter((c) => c.done).length;
  const sorted = Object.entries(b.autoSorted).filter(([, v]) => v.length > 0);

  return (
    <div className="mx-auto max-w-6xl">
      <WorkflowBar steps={workflow.steps} current="research" compact />
      <PageHeader
        eyebrow="Structured brief"
        title={brand.name}
        description="Your profile and research, organized by fixed rules. Nothing here is generated or invented — only rearranged."
        actions={
          <>
            <ButtonLink href={`/brands/${brand.id}`} variant="outline"><PenLine /> Edit profile</ButtonLink>
            <ButtonLink href={`/research?brand=${brand.id}`} variant="outline"><Microscope /> Research</ButtonLink>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6" data-testid="structured-brief">
          <SectionCard title="Brand identity & product">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Product</dt><dd>{b.product.name || "—"}{b.identity.category && ` · ${b.identity.category}`}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Website</dt><dd>{b.identity.website || "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted-foreground">Description</dt><dd>{b.product.description || "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted-foreground">USP</dt><dd>{b.product.usp || "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted-foreground">Features</dt><dd><List items={b.product.features} empty="No features entered" /></dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted-foreground">Pricing & policies</dt><dd>{b.product.pricing || "—"}</dd></div>
            </dl>
          </SectionCard>
          <SectionCard title="Customer">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Target audience</p><p className="text-sm">{b.audience || "—"}</p></div>
              <div><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Pain points</p><List items={b.painPoints} empty="None entered" /></div>
              <div><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Desires</p><List items={b.desires} empty="None entered" /></div>
              <div><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Purchase objections</p><List items={b.objections} empty="None entered" /></div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wider text-success"><ShieldCheck className="size-3.5" /> Verified benefits</p>
                <List items={b.benefits.verified} empty="None yet — required before writing" />
                {b.benefits.unconfirmed.length > 0 && (
                  <>
                    <p className="mb-1 mt-3 text-xs uppercase tracking-wider text-warning">Unconfirmed benefit notes</p>
                    <List items={b.benefits.unconfirmed} empty="" />
                  </>
                )}
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Brand voice">
            <p className="text-sm">{b.voice.tone || <span className="italic text-muted-foreground">No tone of voice entered</span>}</p>
            {b.voice.restrictions.length > 0 && (
              <div className="mt-3"><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Restrictions</p><List items={b.voice.restrictions} empty="" /></div>
            )}
          </SectionCard>
          <SectionCard title="Research evidence">
            <div className="grid gap-5 sm:grid-cols-3">
              <div><p className="mb-1 text-xs uppercase tracking-wider text-success">Verified ({b.evidence.verified.length})</p><Evidence items={b.evidence.verified} /></div>
              <div><p className="mb-1 text-xs uppercase tracking-wider text-warning">Hypotheses ({b.evidence.hypotheses.length})</p><Evidence items={b.evidence.hypotheses} /></div>
              <div><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Unreviewed ({b.evidence.unreviewed.length})</p><Evidence items={b.evidence.unreviewed} /></div>
            </div>
          </SectionCard>
          {sorted.length > 0 && (
            <SectionCard title="Auto-sorted notes (not verified)" description="Lines from general or unreviewed research, grouped by keyword rules. Treat them as leads to confirm — never as facts.">
              <div className="grid gap-5 sm:grid-cols-2">
                {sorted.map(([bucket, notes]) => (
                  <div key={bucket}>
                    <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{RESEARCH_CATEGORY_LABELS[bucket as ResearchCategory] ?? bucket}</p>
                    <ul className="space-y-1.5 text-sm">
                      {notes.map((n, i) => (
                        <li key={i}>{n.text} <span className="text-xs text-muted-foreground">— {n.source}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          <SectionCard title="Product links">
            {b.links.length ? (
              <ul className="space-y-1 text-sm">
                {b.links.map((l) => (
                  <li key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">{l}</a></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-muted-foreground">No links yet.</p>
            )}
          </SectionCard>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <SectionCard title={`Brief completeness · ${done}/${b.completeness.length}`}>
            <ul className="space-y-1.5 text-sm" data-testid="brief-completeness">
              {b.completeness.map((c) => (
                <li key={c.section} className="flex items-center gap-2">
                  {c.done ? <ShieldCheck className="size-4 text-success" /> : <TriangleAlert className="size-4 text-warning" />}
                  <span className={c.done ? "" : "text-muted-foreground"}>{c.section}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Next: plan the campaign" description="Creates a three-email plan from this brief. Works without an API key.">
            <PlanCampaignButton brandId={brand.id} />
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="size-3.5" /> Gaps become visible [placeholders] in the plan — nothing is made up.</p>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
