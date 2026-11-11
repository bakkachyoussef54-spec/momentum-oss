import { CircleCheck, Download, FileText, PackageCheck, Printer, TriangleAlert } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader, SectionCard } from "@/components/common";
import { QueryPicker } from "@/components/query-picker";
import { PackagePreview } from "@/components/delivery/package-preview";
import { listCampaigns } from "@/lib/services/campaigns";
import { buildClientPackage } from "@/lib/services/export";
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "@/lib/constants";
import { emailPackageChecks } from "@/lib/workflow/steps";
import { getWorkflow } from "@/lib/services/workflow";
import { WorkflowBar } from "@/components/workflow/workflow-bar";

export const metadata = { title: "Client Delivery" };

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign: campaignParam } = await searchParams;
  const campaigns = (await listCampaigns()).sort((a, b) => Number(b.status === "completed") - Number(a.status === "completed"));
  const selected = campaigns.find((c) => c.id === campaignParam) ?? null;
  const pkg = selected ? await buildClientPackage(selected.id) : null;
  const workflow = selected ? await getWorkflow({ campaignId: selected.id }) : null;

  return (
    <div className="mx-auto max-w-6xl">
      {workflow && <WorkflowBar steps={workflow.steps} current="review" compact />}
      <PageHeader
        eyebrow="Client Delivery Package"
        title="Client Delivery"
        description="Export approved drafts with strategy, rationale and research notes — ready to send to your client."
        actions={
          campaigns.length > 0 && (
            <QueryPicker
              param="campaign"
              label="Campaign"
              value={selected?.id ?? ""}
              placeholder="Select a campaign…"
              options={campaigns.map((c) => ({ value: c.id, label: `${c.name} (${CAMPAIGN_STATUS_LABELS[c.status as CampaignStatus] ?? c.status})` }))}
            />
          )
        }
      />
      {campaigns.length === 0 ? (
        <EmptyState icon={PackageCheck} title="Nothing to deliver yet" description="Create a campaign, write and approve its emails, then export the package here." action={<ButtonLink href="/campaigns/new">Create New Campaign</ButtonLink>} />
      ) : !selected || !pkg ? (
        <EmptyState icon={PackageCheck} title="Choose a campaign" description="Completed campaigns are listed first." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10">
            <PackagePreview pkg={pkg} />
          </div>
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <SectionCard title="Export Client Package">
              <div id="export" />
              <div className="grid gap-2">
                <ButtonLink href={`/api/export/${selected.id}?format=docx`} prefetch={false} data-testid="export-docx">
                  <Download /> Word (.docx)
                </ButtonLink>
                <ButtonLink href={`/api/export/${selected.id}?format=md`} variant="outline" prefetch={false} data-testid="export-md">
                  <FileText /> Markdown (.md)
                </ButtonLink>
                <ButtonLink href={`/api/export/${selected.id}?format=txt`} variant="outline" prefetch={false} data-testid="export-txt">
                  <FileText /> Plain text (.txt)
                </ButtonLink>
                <ButtonLink href={`/delivery/${selected.id}/print`} variant="ghost">
                  <Printer /> Print / Save as PDF
                </ButtonLink>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">PDF uses your browser’s “Save as PDF” print option on a print-optimized page.</p>
            </SectionCard>
            <SectionCard title="Review checklist">
              <div id="review" className="space-y-4" data-testid="review-checklist">
                {pkg.emails.map((e) => {
                  const r = emailPackageChecks(e);
                  const ok = r.checks.every((c) => c.ok);
                  return (
                    <div key={e.position}>
                      <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                        {ok ? <CircleCheck className="size-4 text-success" /> : <TriangleAlert className="size-4 text-warning" />} Email {e.position}
                        {e.editorId && (
                          <a href={`/editor/${e.editorId}`} className="ml-auto text-xs font-normal text-primary hover:underline">
                            Open
                          </a>
                        )}
                      </p>
                      <ul className="space-y-0.5 pl-6 text-xs">
                        {r.checks.map((c) => (
                          <li key={c.label} className={c.ok ? "text-muted-foreground" : "text-warning"}>
                            {c.ok ? "✓" : "○"} {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {selected.status !== "completed" && <p className="mt-3 text-xs text-muted-foreground">Tip: mark the campaign “Completed” on its page once every email is approved.</p>}
            </SectionCard>
          </aside>
        </div>
      )}
    </div>
  );
}
