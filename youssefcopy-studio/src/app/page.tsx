import { Activity, ArrowUpRight, Building2, CheckCircle2, Clock3, FileText, Layers, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { ButtonLink, DemoBadge, EmptyState, PageHeader, SectionCard, StatusBadge, timeAgo } from "@/components/common";
import { CAMPAIGN_TYPE_LABELS, type CampaignType } from "@/lib/constants";
import { getDashboardData } from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const d = await getDashboardData();
  const stats = [
    { label: "Total Brands", value: d.totalBrands, icon: Building2, href: "/brands" },
    { label: "Active Campaigns", value: d.activeCampaigns, icon: Layers, href: "/campaigns" },
    { label: "Email Drafts", value: d.emailDrafts, icon: FileText, href: "/editor" },
    { label: "Completed Emails", value: d.completedEmails, icon: CheckCircle2, href: "/delivery" },
    { label: "Drafts Awaiting Review", value: d.awaitingReview, icon: Clock3, href: "/editor" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="YoussefCopy Studio"
        title="Good copy starts with good research."
        description="Organize client research, plan sequences with a clear strategy for every email, and deliver polished drafts — with you in editorial control."
        actions={
          <ButtonLink href="/campaigns/new" size="lg" className="h-10 px-4">
            <Plus /> Create New Campaign
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-border bg-card p-4 outline-none transition-all hover:-translate-y-0.5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <s.icon className="size-4" />
              <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-4 font-display text-3xl tabular-nums" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {s.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Counts come directly from your saved records. The studio never shows estimated open rates, clicks or revenue.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Recent campaigns" actions={<ButtonLink href="/campaigns" variant="ghost" size="sm">View all</ButtonLink>}>
          {d.recentCampaigns.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No campaigns yet"
              description="Create a brand profile with verified research, then plan your first sequence."
              action={<ButtonLink href={d.totalBrands ? "/campaigns/new" : "/brands/new"}>{d.totalBrands ? "Create New Campaign" : "Add your first brand"}</ButtonLink>}
            />
          ) : (
            <ul className="divide-y divide-border">
              {d.recentCampaigns.map((c) => {
                const approved = c.emails.filter((e) => e.status === "approved").length;
                const written = c.emails.filter((e) => e.contentOrigin !== "empty").length;
                return (
                  <li key={c.id}>
                    <Link href={`/campaigns/${c.id}`} className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{c.name}</p>
                          {c.isDemo && <DemoBadge />}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.brand.name} · {CAMPAIGN_TYPE_LABELS[c.type as CampaignType] ?? c.type} · updated {timeAgo(c.updatedAt)}
                        </p>
                      </div>
                      <div className="hidden text-right text-xs text-muted-foreground sm:block">
                        <p className="tabular-nums">{written}/{c.emails.length} written</p>
                        <p className="tabular-nums">{approved} approved</p>
                      </div>
                      <StatusBadge kind="campaign" status={c.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent activity">
          {d.recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Activity from brands, campaigns and drafts will appear here.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-4">
              {d.recentActivity.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary/70 ring-4 ring-card" />
                  <p className="text-sm leading-snug">{a.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
          {d.demoBrands === 0 && d.totalBrands === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm">
              <Activity className="mb-2 size-4 text-primary" />
              Want to explore first? Load the fictional demo brand from{" "}
              <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
                Settings
              </Link>
              . Demo records are labelled and removable in one click.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
