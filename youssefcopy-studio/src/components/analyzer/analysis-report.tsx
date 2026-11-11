import { CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/analyzer";
import { ScoreRing } from "./score-ring";

export function AnalysisReport({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6" data-testid="analysis-report">
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card p-5">
        <ScoreRing score={result.totalScore} size={112} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">{result.totalScore}/100</p>
          <p className="text-sm text-muted-foreground">
            {result.stats.words} words · {result.stats.sentences} sentences · avg {result.stats.avgSentenceLength} words/sentence · ~{result.stats.readingMinutes} min read
          </p>
          <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" /> {result.disclaimer}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-base">Score breakdown</h2>
          <ul className="space-y-4">
            {result.breakdown.map((b) => (
              <li key={b.key}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{b.label}</span>
                  <span className="tabular-nums text-muted-foreground">{b.score} / {b.max}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(b.score / b.max) * 100}%` }} />
                </div>
                {b.notes.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    {b.notes.map((n) => <li key={n}>• {n}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <h2 className="mb-3 font-display text-base">Top 3 highest-priority weaknesses</h2>
            {result.weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weaknesses found by the rule set. A human review is still recommended.</p>
            ) : (
              <ol className="space-y-3" data-testid="weaknesses">
                {result.weaknesses.map((w, i) => (
                  <li key={w.title} className="flex gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-white">{i + 1}</span>
                    <div>
                      <p className="font-medium">{w.title}</p>
                      <p className="text-muted-foreground">{w.why}</p>
                      <p className="mt-1"><span className="font-medium text-primary">Fix:</span> {w.suggestion}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-base">Flags ({result.flags.length})</h2>
            {result.flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues flagged by the rule set. A human review is still recommended.</p>
            ) : (
              <ul className="space-y-3">
                {result.flags.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm" data-testid="analysis-flag">
                    <CircleAlert className={cn("mt-0.5 size-4 shrink-0", f.severity === "high" ? "text-destructive" : f.severity === "medium" ? "text-warning" : "text-muted-foreground")} />
                    <div>
                      <p className="font-medium">
                        {f.label} <span className="ml-1 text-xs font-normal uppercase tracking-wider text-muted-foreground">{f.severity}</span>
                      </p>
                      <p className="text-muted-foreground">{f.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
