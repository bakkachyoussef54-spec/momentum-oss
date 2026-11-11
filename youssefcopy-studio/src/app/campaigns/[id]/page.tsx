import { notFound } from "next/navigation";
import { PackageCheck, PenLine, Sparkles, TriangleAlert } from "lucide-react";
import { ButtonLink, DemoBadge, OriginBadge, PageHeader, SectionCard, StatusBadge } from "@/components/common";
import { CampaignControls } from "@/components/campaigns/campaign-controls";
import { DangerZone } from "@/components/danger-zone";
import { archiveCampaignAction, deleteCampaignAction } from "@/app/actions";
import { getCampaign, parseBrief } from "@/lib/services/campaigns";
import { CAMPAIGN_TYPE_LABELS, type CampaignType } from "@/lib/constants";
import { parseStringArray } from "@/lib/json";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCampaign(id);
  if (!c) notFound();
  const brief = parseBrief(c.brief);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={`${c.brand.name} · ${CAMPAIGN_TYPE_LABELS[c.type as CampaignType]}`}
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {c.isDemo && <DemoBadge />}
            <StatusBadge kind="campaign" status={c.status} />
            <span>{c.emails.length}-email sequence</span>
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/generate?campaign=${c.id}`} variant="outline">
              <Sparkles /> Generate drafts
            </ButtonLink>
            <ButtonLink href={`/delivery?campaign=${c.id}`}>
              <PackageCheck /> Client delivery
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <SectionCard title="Campaign brief" description="Planned by the rule-based strategist from stored research (stages A–D).">
            {brief ? (
              <div className="space-y-5">
                <p className="leading-relaxed">{brief.strategy}</p>
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  {[
                    ["Primary problem", brief.primaryProblem],
                    ["Primary promise", brief.primaryPromise],
                    ["Top objection", brief.topObjection],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-muted/50 p-3">
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
                      <dd className={v ? "mt-1" : "mt-1 italic text-muted-foreground"}>{v || "Not provided"}</dd>
                    </div>
                  ))}
                </dl>
                {brief.warnings.length > 0 && (
                  <ul className="space-y-1.5 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
                    {brief.warnings.map((w) => (
                      <li key={w} className="flex gap-2">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" /> {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No brief stored. Use “Refresh brief”.</p>
            )}
          </SectionCard>

          <section aria-label="Email sequence" className="space-y-4">
            {c.emails.map((e) => {
              const plan = brief?.emails.find((b) => b.position === e.position);
              const subject = parseStringArray(e.subjectLines)[e.selectedSubject];
              return (
                <article key={e.id} className="rounded-2xl border border-border bg-card p-5" data-testid="sequence-email">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-display text-primary">{e.position}</span>
                      <div>
                        <h3 className="font-display text-base">{e.role}</h3>
                        <p className="text-sm text-muted-foreground">{e.objective}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <OriginBadge origin={e.contentOrigin} />
                      <StatusBadge kind="email" status={e.status} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Framework</p>
                      <p className="font-medium">{e.framework}</p>
                      {plan && <p className="mt-0.5 text-xs text-muted-foreground">{plan.frameworkReason}</p>}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Segment</p>
                      <p>{e.segment}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Timing</p>
                      <p>{plan?.timing ?? "—"}</p>
                    </div>
                  </div>
                  {plan && (
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <p><span className="text-muted-foreground">Problem:</span> {plan.focusProblem}</p>
                      <p><span className="text-muted-foreground">Promise:</span> {plan.focusPromise}</p>
                      <p className="sm:col-span-2 text-muted-foreground">Outline: {plan.keyPoints.join(" → ")}</p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="min-w-0 truncate text-sm text-muted-foreground">{subject ? `Subject: ${subject}` : "Not written yet"}</p>
                    <ButtonLink href={`/editor/${e.id}`} size="sm" variant={e.contentOrigin === "empty" ? "default" : "outline"}>
                      <PenLine /> {e.contentOrigin === "empty" ? "Write email" : "Open editor"}
                    </ButtonLink>
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <SectionCard title="Campaign">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Audience</dt><dd>{c.audience}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Goal</dt><dd>{c.goal}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Tone</dt><dd>{c.tone}</dd></div>
            </dl>
            <div className="mt-5">
              <CampaignControls id={c.id} status={c.status} />
            </div>
          </SectionCard>
          <DangerZone
            entity="campaign"
            name={c.name}
            archived={Boolean(c.archivedAt)}
            onArchive={archiveCampaignAction.bind(null, c.id)}
            onDelete={deleteCampaignAction.bind(null, c.id)}
            redirectTo="/campaigns"
            consequences="All emails, versions and analyses in this campaign will be deleted."
          />
        </aside>
      </div>
    </div>
  );
}
