import Link from "next/link";
import { Check, ChevronRight, CircleDashed, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/lib/workflow/steps";

/** Brand Profile → Research → Campaign → Email 1–3 → Review → Export, with live status. */
export function WorkflowBar({ steps, current, compact }: { steps: WorkflowStep[]; current?: string; compact?: boolean }) {
  const done = steps.filter((s) => s.status === "complete").length;
  return (
    <nav aria-label="Campaign workflow" className={cn("no-print rounded-2xl border border-border bg-card", compact ? "mb-6 p-2" : "p-4")} data-testid="workflow-bar">
      {!compact && (
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guided workflow</p>
          <p className="text-xs tabular-nums text-muted-foreground">{done}/{steps.length} steps complete</p>
        </div>
      )}
      <ol className="flex items-stretch gap-1 overflow-x-auto">
        {steps.map((s, i) => {
          const active = s.key === current;
          return (
            <li key={s.key} className="flex min-w-0 items-center">
              <Link
                href={s.href}
                aria-current={active ? "step" : undefined}
                title={s.detail}
                data-status={s.status}
                data-testid={`workflow-step-${s.key}`}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-primary/10 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full",
                    s.status === "complete" ? "bg-success text-white" : s.status === "in_progress" ? "bg-primary/15 text-primary" : "ring-1 ring-border",
                  )}
                >
                  {s.status === "complete" ? <Check className="size-3" /> : s.status === "in_progress" ? <PenLine className="size-2.5" /> : <CircleDashed className="size-3 opacity-50" />}
                </span>
                <span>{s.label}</span>
                <span className="sr-only">
                  {" "}— {s.status === "complete" ? "complete" : s.status === "in_progress" ? "in progress" : "not started"}: {s.detail}
                </span>
              </Link>
              {i < steps.length - 1 && <ChevronRight className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/40" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
