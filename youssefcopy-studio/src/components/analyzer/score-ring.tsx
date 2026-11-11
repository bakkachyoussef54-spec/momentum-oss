import { cn } from "@/lib/utils";

export function ScoreRing({ score, size = 96, className }: { score: number; size?: number; className?: string }) {
  const stroke = Math.max(5, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 75 ? "var(--success)" : score >= 55 ? "#0057FF" : score >= 40 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`Score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display tabular-nums" style={{ fontSize: size / 3.4 }} data-testid="score-value">
        {score}
      </span>
    </div>
  );
}
