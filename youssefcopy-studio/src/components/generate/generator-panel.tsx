"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CircleCheck, CircleX, LayoutTemplate, Loader2, PenLine, Sparkles, Square, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OriginBadge, StatusBadge } from "@/components/common";
import { applyTemplateAction } from "@/app/actions";

interface GenEmail {
  id: string;
  position: number;
  role: string;
  framework: string;
  objective: string;
  status: string;
  contentOrigin: string;
  suggestedTemplate: { id: string; name: string } | null;
}

type RowState = { state: "idle" | "running" | "done" | "error" | "cancelled"; message?: string };

export function GeneratorPanel({
  emails,
  ai,
  readiness,
}: {
  emails: GenEmail[];
  ai: { available: boolean; reason: string; model: string | null; provider: string | null; costAware: boolean };
  readiness: "ready" | "partial" | "insufficient";
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState<GenEmail[] | null>(null);
  const [tokens, setTokens] = useState({ input: 0, output: 0, cost: 0, known: false });
  const [pending, start] = useTransition();
  const abort = useRef<AbortController | null>(null);

  const blocked = readiness === "insufficient";

  const requestGenerate = (targets: GenEmail[]) => {
    if (targets.some((t) => t.contentOrigin !== "empty" || t.status === "approved")) setConfirm(targets);
    else void generate(targets);
  };

  const generate = async (targets: GenEmail[]) => {
    setConfirm(null);
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    for (const e of targets) {
      if (controller.signal.aborted) {
        setRows((r) => ({ ...r, [e.id]: { state: "cancelled", message: "Skipped" } }));
        continue;
      }
      setRows((r) => ({ ...r, [e.id]: { state: "running" } }));
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ emailId: e.id, overwriteApproved: true }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setRows((r) => ({ ...r, [e.id]: { state: "error", message: data.error } }));
          if (data.code === "auth" || data.code === "not_configured" || data.code === "rate_limit") break;
          continue;
        }
        const u = data.usage as { inputTokens: number | null; outputTokens: number | null; estimatedCostUsd: number | null };
        setTokens((t) => ({ input: t.input + (u.inputTokens ?? 0), output: t.output + (u.outputTokens ?? 0), cost: t.cost + (u.estimatedCostUsd ?? 0), known: t.known || u.inputTokens !== null }));
        const missing: string[] = data.missingInformation ?? [];
        setRows((r) => ({ ...r, [e.id]: { state: "done", message: `AI-assisted draft saved — open the editor to review.${missing.length ? ` Missing info reported: ${missing.join("; ")}` : ""}` } }));
      } catch (err) {
        const cancelled = (err as Error).name === "AbortError";
        setRows((r) => ({ ...r, [e.id]: { state: cancelled ? "cancelled" : "error", message: cancelled ? "Cancelled" : "Network error" } }));
        if (cancelled) continue;
      }
    }
    setRunning(false);
    router.refresh();
  };

  const scaffold = (e: GenEmail) => {
    if (!e.suggestedTemplate) return;
    if (e.contentOrigin !== "empty" && !window.confirm("Replace the current draft with the template? Your draft is saved in version history first.")) return;
    start(async () => {
      const res = await applyTemplateAction(e.id, e.suggestedTemplate!.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Template scaffold added to email ${e.position}`);
      router.refresh();
    });
  };

  const empties = emails.filter((e) => e.contentOrigin === "empty");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        {ai.available ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <span className="size-2 rounded-full bg-success" /> Live AI: {ai.provider} · {ai.model}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generation sends the brand profile and research for this campaign to the configured provider only when you click generate. Existing drafts are kept in version history.
              </p>
              {tokens.known && (
                <p className="mt-1 text-xs text-muted-foreground" data-testid="token-usage">
                  This session: {tokens.input.toLocaleString()} input + {tokens.output.toLocaleString()} output tokens{ai.costAware ? ` · ~$${tokens.cost.toFixed(4)} estimated` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={() => abort.current?.abort()}>
                  <Square /> Cancel
                </Button>
              ) : (
                <Button onClick={() => requestGenerate(empties.length ? empties : emails)} disabled={blocked}>
                  <Sparkles /> {empties.length === emails.length ? `Generate ${emails.length}-email campaign` : empties.length ? `Generate ${empties.length} empty email${empties.length === 1 ? "" : "s"}` : "Regenerate all"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3" data-testid="ai-disabled-notice">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium">Live AI generation is disabled</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ai.reason} You can still prepare every email manually: start from a recommended template scaffold (clearly labelled “From template”, never presented as AI) or write directly in the editor. See Settings for setup instructions.
              </p>
            </div>
          </div>
        )}
        {blocked && ai.available && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="size-4" /> Research is insufficient — add the missing required details in Brand Research before generating.
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {emails.map((e) => {
          const row = rows[e.id];
          return (
            <li key={e.id} className="rounded-2xl border border-border bg-card p-5" data-testid="generator-row">
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-display text-primary">{e.position}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.role}</p>
                  <p className="text-sm text-muted-foreground">{e.objective}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Framework: {e.framework}</p>
                </div>
                <div className="flex items-center gap-2">
                  <OriginBadge origin={e.contentOrigin} />
                  <StatusBadge kind="email" status={e.status} />
                </div>
              </div>
              {row && (
                <p className={`mt-3 flex items-center gap-2 text-sm ${row.state === "error" ? "text-destructive" : "text-muted-foreground"}`} role="status">
                  {row.state === "running" && <Loader2 className="size-4 animate-spin" />}
                  {row.state === "done" && <CircleCheck className="size-4 text-success" />}
                  {row.state === "error" && <CircleX className="size-4" />}
                  {row.state === "running" ? "Writing draft (research validation → strategy → draft)…" : row.message}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {ai.available && (
                  <Button size="sm" onClick={() => requestGenerate([e])} disabled={running || blocked}>
                    <Sparkles /> {e.contentOrigin === "empty" ? "Generate draft" : "Regenerate"}
                  </Button>
                )}
                {e.suggestedTemplate && (
                  <Button size="sm" variant="outline" onClick={() => scaffold(e)} disabled={running || pending}>
                    <LayoutTemplate /> Use template: {e.suggestedTemplate.name}
                  </Button>
                )}
                <Link href={`/editor/${e.id}`} className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] font-medium hover:bg-muted">
                  <PenLine className="size-3.5" /> Open in editor
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace existing drafts?</DialogTitle>
            <DialogDescription>
              {confirm?.filter((c) => c.contentOrigin !== "empty").length} email(s) already have content{confirm?.some((c) => c.status === "approved") ? `, including ${confirm.filter((c) => c.status === "approved").length} approved email(s)` : ""}. New AI-assisted drafts will replace the working copy; every current draft is saved in version history first and can be restored. Approved versions stay in client exports until you approve again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button onClick={() => confirm && generate(confirm)}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
