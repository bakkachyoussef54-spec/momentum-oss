import { KeyRound, ShieldCheck } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/common";
import { AiToggle, BackupControls, DemoControls, RestoreButton } from "@/components/settings/settings-controls";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { getAiSettings, getAiStatus, getResolvedAiConfig, isAiEnabledByUser } from "@/lib/services/settings";
import { keyPresence, PROVIDER_LABELS } from "@/lib/ai/config";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [ai, enabled, demoCount, archivedBrands, archivedCampaigns, aiSettings, resolved] = await Promise.all([
    getAiStatus(),
    isAiEnabledByUser(),
    db.brand.count({ where: { isDemo: true } }),
    db.brand.findMany({ where: { archivedAt: { not: null } }, orderBy: { archivedAt: "desc" } }),
    db.campaign.findMany({ where: { archivedAt: { not: null } }, orderBy: { archivedAt: "desc" }, include: { brand: { select: { name: true } } } }),
    getAiSettings(),
    getResolvedAiConfig(),
  ]);
  const { config } = resolved;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="Workspace" title="Settings" description="AI Mode provider, data backup, demo data and archived records." />

      <section id="ai">
      <SectionCard title="AI Mode provider" description="Optional. Human Mode, planning, analysis and export all work without any AI provider or subscription.">
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-3" data-testid="ai-status">
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p><p className="font-medium">{ai.available ? "Ready" : config ? "Configured · disabled" : "Not configured"}</p></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Provider</p><p className="font-medium">{config ? PROVIDER_LABELS[config.provider] : "—"}</p></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Model</p><p className="font-medium">{config?.model ?? "—"}</p></div>
            {config && <div className="sm:col-span-3 text-xs text-muted-foreground">{ai.baseUrl ? `${ai.baseUrl} · ` : ""}Timeout {Math.round(config.timeoutMs / 1000)}s · cost estimates {config.provider === "ollama" ? "not needed (local)" : ai.costAware ? "on" : "off (set AI_INPUT_COST_PER_MTOK and AI_OUTPUT_COST_PER_MTOK)"}</div>}
            {!config && <p className="sm:col-span-3 text-xs text-muted-foreground">{ai.reason}</p>}
          </div>
          <AiSettingsForm initial={aiSettings} envProvider={(process.env.AI_PROVIDER ?? "none").toLowerCase()} keys={keyPresence()} />
          <AiToggle enabled={enabled} configured={Boolean(config)} />
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="mb-2 flex items-center gap-2 font-medium"><KeyRound className="size-4 text-primary" /> API keys & local AI</p>
            <p className="text-muted-foreground">Paid providers need a key in <code className="rounded bg-muted px-1">.env</code> (restart the app after editing):</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-5">{`OPENAI_API_KEY=sk-...        # OpenAI
ANTHROPIC_API_KEY=...        # Anthropic`}</pre>
            <p className="mt-3 text-muted-foreground">Free local option — <span className="font-medium text-foreground">Ollama</span> (no key, no subscription):</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-5">{`1. Install from https://ollama.com/download (Windows installer)
2. ollama pull qwen3:1.7b
3. Choose "Ollama (local)" above → Save & test connection`}</pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Keys stay on the server and are never sent to the browser. The studio only calls the provider you choose — it never falls back to another paid provider — and research is only sent when you click a generate or AI action.
            </p>
          </div>
        </div>
      </SectionCard>
      </section>

      <SectionCard title="Backup & restore" description="Download everything as JSON, or merge a backup back in. Imports never delete records.">
        <BackupControls />
      </SectionCard>

      <SectionCard title="Demo data" description="A fictional sleep-mask brand for exploring the studio. Demo records are labelled and kept separate from your real clients.">
        <DemoControls hasDemo={demoCount > 0} />
      </SectionCard>

      <SectionCard title="Archived records">
        {archivedBrands.length + archivedCampaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing archived.</p>
        ) : (
          <ul className="divide-y divide-border">
            {archivedBrands.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>Brand · <span className="font-medium">{b.name}</span></span>
                <RestoreButton kind="brand" id={b.id} />
              </li>
            ))}
            {archivedCampaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>Campaign · <span className="font-medium">{c.name}</span> <span className="text-muted-foreground">({c.brand.name})</span></span>
                <RestoreButton kind="campaign" id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Security & scope">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> Single-user local app with no authentication. Do not deploy it publicly without adding authentication.</li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> No email sending and no web scraping. Imported documents are read as plain text only and never executed.</li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> Imported research is treated as untrusted data: lines that look like AI instructions are flagged and withheld from prompts.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
