import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_STATUS_LABELS, CONTENT_ORIGIN_LABELS, EMAIL_STATUS_LABELS, RESEARCH_STATUS_LABELS, type CampaignStatus, type EmailStatus, type ResearchStatus } from "@/lib/constants";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        {description && <div className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "default",
  size = "default",
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "xs" | "icon";
  className?: string;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {children}
    </Link>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-grid relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="size-5" />
      </div>
      <h2 className="font-display text-lg">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SectionCard({ title, description, children, className, actions }: { title?: string; description?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-base">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const statusTone: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  drafting: "bg-primary/15 text-primary",
  review: "bg-warning/15 text-warning",
  completed: "bg-success/15 text-success",
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  verified: "bg-success/15 text-success",
  hypothesis: "bg-warning/15 text-warning",
  unreviewed: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, kind }: { status: string; kind: "campaign" | "email" | "research" }) {
  const label =
    kind === "campaign"
      ? CAMPAIGN_STATUS_LABELS[status as CampaignStatus]
      : kind === "email"
        ? EMAIL_STATUS_LABELS[status as EmailStatus]
        : RESEARCH_STATUS_LABELS[status as ResearchStatus];
  return <Badge className={cn("border-0 font-medium", statusTone[status] ?? "bg-muted")}>{label ?? status}</Badge>;
}

export function OriginBadge({ origin }: { origin: string }) {
  const tone =
    origin === "ai" ? "bg-violet-500/15 text-violet-500 dark:text-violet-300" : origin === "ai_edited" ? "bg-sky-500/15 text-sky-600 dark:text-sky-300" : origin === "template" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : origin === "manual" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground";
  return <Badge className={cn("border-0 font-medium", tone)}>{CONTENT_ORIGIN_LABELS[origin] ?? origin}</Badge>;
}

export function DemoBadge() {
  return <Badge variant="outline" className="border-dashed text-[10px] uppercase tracking-wider">Demo</Badge>;
}

export function Field({ label, htmlFor, hint, children, error }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
