import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { ButtonLink, DemoBadge, EmptyState, PageHeader, StatusBadge, timeAgo } from "@/components/common";
import { listCampaigns } from "@/lib/services/campaigns";
import { CAMPAIGN_TYPE_LABELS, type CampaignType } from "@/lib/constants";

export const metadata = { title: "Campaign Builder" };

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Campaign Builder"
        title="Campaigns"
        description="Strategically planned sequences — one problem and one promise per email."
        actions={
          <ButtonLink href="/campaigns/new">
            <Plus /> Create New Campaign
          </ButtonLink>
        }
      />
      {campaigns.length === 0 ? (
        <EmptyState icon={Layers} title="No campaigns yet" description="Use the guided builder to plan your first sequence." action={<ButtonLink href="/campaigns/new">Create New Campaign</ButtonLink>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const total = c.emails.length;
            const approved = c.emails.filter((e) => e.status === "approved").length;
            const written = c.emails.filter((e) => e.contentOrigin !== "empty").length;
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="group rounded-2xl border border-border bg-card p-5 outline-none transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{c.brand.name}</p>
                    <h2 className="mt-0.5 truncate font-display text-lg">{c.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.isDemo && <DemoBadge />}
                    <StatusBadge kind="campaign" status={c.status} />
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{CAMPAIGN_TYPE_LABELS[c.type as CampaignType]} · {total} emails</p>
                <div className="mt-5 flex gap-1" aria-label={`${written} of ${total} written, ${approved} approved`}>
                  {c.emails.map((e) => (
                    <span key={e.id} className={`h-1.5 flex-1 rounded-full ${e.status === "approved" ? "bg-success" : e.contentOrigin !== "empty" ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {written}/{total} written · {approved} approved · updated {timeAgo(c.updatedAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
