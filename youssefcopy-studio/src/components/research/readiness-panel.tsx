import { CircleAlert, CircleCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResearchValidation } from "@/lib/research/validate";

const READINESS = {
  ready: { label: "Ready to write", tone: "text-success bg-success/10 ring-success/30", icon: CircleCheck },
  partial: { label: "Partially ready", tone: "text-warning bg-warning/10 ring-warning/30", icon: TriangleAlert },
  insufficient: { label: "Insufficient evidence", tone: "text-destructive bg-destructive/10 ring-destructive/30", icon: CircleAlert },
} as const;

export function ReadinessPanel({ validation, compact }: { validation: ResearchValidation; compact?: boolean }) {
  const r = READINESS[validation.readiness];
  const required = validation.missing.filter((m) => m.severity === "required");
  const recommended = validation.missing.filter((m) => m.severity === "recommended");
  return (
    <div className="space-y-4" data-testid="readiness-panel">
      <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1", r.tone)}>
        <r.icon className="size-4" /> {r.label}
        <span className="ml-auto text-xs font-normal opacity-80">
          {validation.counts.verified} verified · {validation.counts.hypothesis} hypotheses · {validation.counts.unreviewed} unreviewed
        </span>
      </div>
      {required.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">Missing — required</p>
          <ul className="space-y-1.5 text-sm">
            {required.map((m) => (
              <li key={m.field}>
                <span className="font-medium">{m.label}.</span> <span className="text-muted-foreground">{m.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!compact && recommended.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {recommended.map((m) => (
              <li key={m.field}>
                {m.label} — {m.why}
              </li>
            ))}
          </ul>
        </div>
      )}
      {validation.warnings.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {validation.warnings.map((w) => (
            <li key={w} className="flex gap-2 text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" /> {w}
            </li>
          ))}
        </ul>
      )}
      {validation.healthClaimRisks.length > 0 && (
        <div className="rounded-xl border border-destructive/30 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">
            <ShieldAlert className="size-3.5" /> Health-claim risks in profile
          </p>
          <ul className="space-y-1 text-sm">
            {validation.healthClaimRisks.map((h, i) => (
              <li key={i}>
                <span className="font-medium">{h.field}:</span> {h.reason} — <span className="text-muted-foreground">{h.excerpt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
