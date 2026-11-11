"use client";

import { useRef, useState } from "react";
import { Bot, Loader2, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REVIEW_LABELS } from "@/lib/ai/prompts";

export interface AiReview {
  summary: string;
  categories: { key: keyof typeof REVIEW_LABELS; score: number; comment: string }[];
  improvements: string[];
  factualConcerns: string[];
  total: number;
  model?: string;
  createdAt?: string;
}

/** Optional AI-assisted editorial review. Advisory only and clearly labelled. */
export function AiReviewPanel({ emailId, ai, last }: { emailId: string; ai: { available: boolean; reason: string; model: string | null }; last: AiReview | null }) {
  const [review, setReview] = useState<AiReview | null>(last);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const run = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emailId }), signal: controller.signal });
      const data = await res.json();
      if (!res.ok) return void toast.error(data.error ?? "AI review failed", { duration: 10_000 });
      setReview({ ...data.review, model: data.usage?.model });
    } catch (err) {
      if ((err as Error).name === "AbortError") toast.info("AI review cancelled");
      else toast.error("Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5" data-testid="ai-review">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base"><Bot className="size-4 text-primary" /> AI-assisted editorial review <span className="text-xs font-normal text-muted-foreground">(optional)</span></h2>
          <p className="text-xs text-muted-foreground">A second opinion from {ai.model ?? "your AI provider"}. Editorial judgement only — it cannot predict sales, opens or clicks.</p>
        </div>
        {ai.available ? (
          <div className="flex gap-2">
            {busy && <Button variant="outline" size="sm" onClick={() => abort.current?.abort()}><Square /> Cancel</Button>}
            <Button size="sm" onClick={run} disabled={busy} data-testid="ai-review-run">{busy ? <Loader2 className="animate-spin" /> : <Bot />} {review ? "Review again" : "Run AI review"}</Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Not available: {ai.reason}</p>
        )}
      </div>
      {review && (
        <div className="mt-4 space-y-4 text-sm">
          {review.summary && <p>{review.summary}</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            {review.categories.map((c) => (
              <li key={c.key} className="rounded-lg bg-muted/50 p-3">
                <p className="flex justify-between font-medium"><span>{REVIEW_LABELS[c.key] ?? c.key}</span><span className="tabular-nums">{c.score}/10</span></p>
                {c.comment && <p className="mt-0.5 text-xs text-muted-foreground">{c.comment}</p>}
              </li>
            ))}
          </ul>
          {review.improvements.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioritized improvements</p>
              <ol className="list-decimal space-y-1 pl-5">{review.improvements.map((i) => <li key={i}>{i}</li>)}</ol>
            </div>
          )}
          {review.factualConcerns.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="mb-1 font-medium">Factual grounding concerns</p>
              <ul className="list-disc pl-5 text-muted-foreground">{review.factualConcerns.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">AI-assisted · {review.model ?? ""}{review.createdAt ? ` · ${new Date(review.createdAt).toLocaleString()}` : ""}</p>
        </div>
      )}
    </section>
  );
}
