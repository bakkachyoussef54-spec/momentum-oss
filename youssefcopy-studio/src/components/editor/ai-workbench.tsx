"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bot, Loader2, Settings2, Sparkles, Square, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FRAMEWORKS } from "@/lib/constants";
import { EMAIL_LENGTHS, type EmailLength } from "@/lib/ai/config";

export interface AiPrefs {
  tone: string;
  length: EmailLength;
  framework: string;
  temperature: number | null;
}

export interface AiProposal {
  action: string;
  label: string;
  changes: { subjectLines?: string[]; previewText?: string; hook?: string; body?: string; cta?: string; rationale?: string };
  options?: { target: "previewText" | "hook" | "cta"; values: string[] };
  summary: string;
  missingInformation: string[];
  usage?: { model: string; inputTokens: number | null; outputTokens: number | null; estimatedCostUsd: number | null };
}

const PART_ACTIONS = [
  { id: "subject_lines", label: "Subject lines" },
  { id: "preview_options", label: "Preview text", target: "previewText" },
  { id: "hook_options", label: "Opening hooks", target: "hook" },
  { id: "write_body", label: "Body copy" },
  { id: "cta_options", label: "CTAs", target: "cta" },
  { id: "write_rationale", label: "Rationale" },
] as const;

const IMPROVE_ACTIONS = [
  { id: "rewrite", label: "Rewrite draft" },
  { id: "improve", label: "Improve email" },
  { id: "improve_clarity", label: "Improve clarity" },
  { id: "strengthen_hook", label: "Strengthen hook" },
  { id: "more_conversational", label: "More conversational" },
  { id: "focus_benefits", label: "Focus on benefits" },
  { id: "improve_cta", label: "Improve CTA" },
  { id: "shorten", label: "Shorten email" },
] as const;

const OPTION_TARGETS: Record<string, "previewText" | "hook" | "cta"> = { preview_options: "previewText", hook_options: "hook", cta_options: "cta" };

export function AiWorkbench({
  emailId,
  ai,
  approved,
  hasContent,
  defaults,
  getCurrent,
  beforeRequest,
  onProposal,
  onGenerated,
}: {
  emailId: string;
  ai: { available: boolean; reason: string; model: string | null; providerLabel: string | null; isLocal: boolean };
  approved: boolean;
  hasContent: boolean;
  defaults: AiPrefs;
  getCurrent: () => { subjectLines: string[]; previewText: string; hook: string; body: string; cta: string; rationale: string };
  beforeRequest: () => Promise<boolean>;
  onProposal: (p: AiProposal) => void;
  onGenerated: (info: { missingInformation: string[] }) => void;
}) {
  const [prefs, setPrefs] = useState<AiPrefs>(defaults);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDraft, setConfirmDraft] = useState(false);
  const [lastMissing, setLastMissing] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);

  const prefsPayload = { tone: prefs.tone, length: prefs.length, framework: prefs.framework, temperature: prefs.temperature };

  const call = async (url: string, body: object, key: string) => {
    if (!(await beforeRequest())) return null;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(key);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "AI request failed", { duration: 10_000 });
        return null;
      }
      return data;
    } catch (err) {
      if ((err as Error).name === "AbortError") toast.info("AI request cancelled — nothing was changed");
      else toast.error("Could not reach the server");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const generateDraft = async () => {
    setConfirmDraft(false);
    const data = await call("/api/ai/generate", { emailId, prefs: prefsPayload, overwriteApproved: approved }, "draft");
    if (!data) return;
    setLastMissing(data.missingInformation ?? []);
    if (data.missingInformation?.length) toast.warning(`The AI reported missing information (not invented): ${data.missingInformation.join("; ")}`, { duration: 15_000 });
    toast.success(`AI-assisted draft created${data.usage?.inputTokens != null ? ` (${data.usage.inputTokens + (data.usage.outputTokens ?? 0)} tokens)` : ""}. The previous draft is in version history.`);
    onGenerated({ missingInformation: data.missingInformation ?? [] });
  };

  const revise = async (id: string, label: string) => {
    const data = await call("/api/ai/revise", { emailId, action: id, current: getCurrent(), prefs: prefsPayload }, id);
    if (!data) return;
    const { changeSummary, missingInformation, options, ...changes } = data.proposal as AiProposal["changes"] & { changeSummary: string; missingInformation: string[]; options?: string[] };
    const target = OPTION_TARGETS[id];
    setLastMissing(missingInformation ?? []);
    onProposal({
      action: id,
      label,
      changes,
      options: target && options?.length ? { target, values: options } : undefined,
      summary: changeSummary,
      missingInformation: missingInformation ?? [],
      usage: data.usage,
    });
  };

  if (!ai.available) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5" data-testid="ai-workbench-disabled">
        <p className="flex items-center gap-2 font-medium"><TriangleAlert className="size-4 text-warning" /> AI Mode is not connected</p>
        <p className="mt-1 text-sm text-muted-foreground">{ai.reason} Human Mode keeps working fully — switch back any time without losing your work.</p>
        <Link href="/settings#ai" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><Settings2 className="size-4" /> Set up a provider (OpenAI, Anthropic, OpenAI-compatible or local Ollama)</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="ai-workbench">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-base"><Bot className="size-4 text-primary" /> AI email copywriter</p>
        <p className="text-xs text-muted-foreground">
          {ai.providerLabel} · {ai.model}
          {ai.isLocal ? " · runs on your machine" : " · sends this brand's research to the provider"}
        </p>
      </div>

      <fieldset className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-4">
        <legend className="sr-only">Generation preferences</legend>
        <label className="space-y-1 text-xs sm:col-span-2">
          <span className="font-medium text-muted-foreground">Tone</span>
          <Input aria-label="AI tone" value={prefs.tone} onChange={(e) => setPrefs({ ...prefs, tone: e.target.value })} placeholder="Brand voice (default)" className="h-8" />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Length</span>
          <select aria-label="AI email length" className="field-select h-8" value={prefs.length} onChange={(e) => setPrefs({ ...prefs, length: e.target.value as EmailLength })}>
            {EMAIL_LENGTHS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Framework</span>
          <select aria-label="AI framework" className="field-select h-8" value={prefs.framework} onChange={(e) => setPrefs({ ...prefs, framework: e.target.value })}>
            <option value="">From plan</option>
            {FRAMEWORKS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs sm:col-span-4">
          <span className="flex justify-between font-medium text-muted-foreground">
            <span>Creativity {prefs.temperature === null ? "(provider default)" : `· ${prefs.temperature.toFixed(1)}`}</span>
            {prefs.temperature !== null && <button type="button" className="text-primary hover:underline" onClick={() => setPrefs({ ...prefs, temperature: null })}>Reset</button>}
          </span>
          <input aria-label="AI creativity" type="range" min={0} max={1} step={0.1} value={prefs.temperature ?? 0.7} onChange={(e) => setPrefs({ ...prefs, temperature: Number(e.target.value) })} className="w-full accent-[#0057FF]" />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => (hasContent || approved ? setConfirmDraft(true) : void generateDraft())} disabled={Boolean(busy)} data-testid="ai-generate-draft">
          {busy === "draft" ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate full draft
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => abort.current?.abort()}>
            <Square /> Cancel
          </Button>
        )}
        {busy && <span className="text-xs text-muted-foreground" role="status">Writing… {ai.isLocal ? "local models can take a minute or two." : ""}</span>}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generate a part (you compare and choose)</p>
        <div className="flex flex-wrap gap-1.5">
          {PART_ACTIONS.map((a) => (
            <Button key={a.id} size="xs" variant="outline" disabled={Boolean(busy)} onClick={() => revise(a.id, a.label)} data-testid={`ai-part-${a.id}`}>
              {busy === a.id && <Loader2 className="animate-spin" />} {a.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rewrite & improve</p>
        <div className="flex flex-wrap gap-1.5">
          {IMPROVE_ACTIONS.map((a) => (
            <Button key={a.id} size="xs" variant="outline" disabled={Boolean(busy) || !hasContent} onClick={() => revise(a.id, a.label)} data-testid={`ai-improve-${a.id}`}>
              {busy === a.id && <Loader2 className="animate-spin" />} {a.label}
            </Button>
          ))}
        </div>
      </div>

      {lastMissing.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm" data-testid="ai-missing-info">
          <p className="font-medium">The AI reported missing information (it did not invent it):</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">{lastMissing.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Everything generated here is labelled <span className="font-medium text-foreground">AI-assisted</span>. Nothing is applied until you accept it, and every change is saved in version history.</p>

      <Dialog open={confirmDraft} onOpenChange={setConfirmDraft}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approved ? "Replace an approved email's draft?" : "Replace the current draft?"}</DialogTitle>
            <DialogDescription>
              {approved
                ? "This email is approved. A new AI-assisted draft will replace the working copy. The approved version stays in history and in client exports until you approve again."
                : "A new AI-assisted draft will replace the working copy. Your current draft is saved in version history first and can be restored."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDraft(false)}>Cancel</Button>
            <Button onClick={generateDraft} data-testid="ai-confirm-generate">Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
