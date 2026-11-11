"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createCampaignAction } from "@/app/actions";
import { CAMPAIGN_TYPE_LABELS, CAMPAIGN_TYPES, LIMITS, TONES, type CampaignType } from "@/lib/constants";

export interface WizardBrand {
  id: string;
  name: string;
  productName: string;
  targetAudience: string;
  toneOfVoice: string;
  readiness: "ready" | "partial" | "insufficient";
  missingRequired: string[];
}

const TYPE_DESCRIPTIONS: Record<CampaignType, string> = {
  welcome: "Introduce, handle the main objection, build trust.",
  abandoned_cart: "Remind, resolve hesitation, final nudge.",
  post_purchase: "Thank, guide usage, add value.",
  product_launch: "Announce, explain, make the case.",
  promotional: "Present an approved offer honestly.",
  win_back: "Reconnect with lapsed customers.",
  educational: "Teach one useful idea, then connect.",
  re_engagement: "Re-activate or gracefully let go.",
};

const STEPS = ["Brand", "Campaign type", "Audience", "Primary goal", "Tone of voice", "Number of emails", "Generate brief"];

export function CampaignWizard({ brands, initialBrandId }: { brands: WizardBrand[]; initialBrandId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(initialBrandId ? 1 : 0);
  const [pending, start] = useTransition();
  const [form, setForm] = useState(() => {
    const b = brands.find((x) => x.id === initialBrandId);
    return { brandId: b?.id ?? "", type: "welcome" as CampaignType, audience: b?.targetAudience ?? "", goal: "", tone: "", emailCount: 3, name: "" };
  });
  const brand = useMemo(() => brands.find((b) => b.id === form.brandId), [brands, form.brandId]);

  const canNext = [
    Boolean(form.brandId),
    Boolean(form.type),
    form.audience.trim().length > 0,
    form.goal.trim().length > 0,
    form.tone.trim().length > 0,
    form.emailCount >= 1 && form.emailCount <= LIMITS.maxEmails,
    true,
  ][step];

  const selectBrand = (id: string) => {
    const b = brands.find((x) => x.id === id);
    setForm((f) => ({ ...f, brandId: id, audience: f.audience || b?.targetAudience || "", tone: f.tone || "" }));
  };

  const submit = () =>
    start(async () => {
      const name = form.name.trim() || `${CAMPAIGN_TYPE_LABELS[form.type]} — ${brand?.name ?? ""}`.slice(0, 200);
      const res = await createCampaignAction({ ...form, name });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Campaign brief generated");
      router.push(`/campaigns/${res.data}`);
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                i === step ? "bg-primary/10 font-medium text-foreground" : i < step ? "text-muted-foreground hover:bg-muted" : "text-muted-foreground/50",
              )}
            >
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1", i < step ? "bg-primary text-white ring-primary" : i === step ? "ring-primary text-primary" : "ring-border")}>
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="min-h-[420px] rounded-2xl border border-border bg-card p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-2xl">{STEPS[step]}</h2>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="mt-6">
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Brand">
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={form.brandId === b.id}
                    onClick={() => selectBrand(b.id)}
                    className={cn("rounded-xl border p-4 text-left transition-all hover:border-primary/50", form.brandId === b.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border")}
                  >
                    <p className="font-medium">{b.name}</p>
                    <p className="text-sm text-muted-foreground">{b.productName || "No product name"}</p>
                  </button>
                ))}
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Campaign type">
                {CAMPAIGN_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={form.type === t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={cn("rounded-xl border p-4 text-left transition-all hover:border-primary/50", form.type === t ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border")}
                  >
                    <p className="font-medium">{CAMPAIGN_TYPE_LABELS[t]}</p>
                    <p className="text-sm text-muted-foreground">{TYPE_DESCRIPTIONS[t]}</p>
                  </button>
                ))}
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <label htmlFor="audience" className="text-sm font-medium">
                  Who receives this campaign?
                </label>
                <Textarea id="audience" rows={4} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="e.g. New subscribers from the sleep-quiz pop-up who haven't purchased yet" />
                <p className="text-xs text-muted-foreground">Pre-filled from the brand's target audience — narrow it to this campaign's segment.</p>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-2">
                <label htmlFor="goal" className="text-sm font-medium">
                  What should this campaign achieve?
                </label>
                <Textarea id="goal" rows={3} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="e.g. Convert new subscribers into first-time buyers" />
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tone presets">
                  {TONES.map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={form.tone === t} onClick={() => setForm({ ...form, tone: t })} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", form.tone === t ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50")}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <label htmlFor="tone" className="text-sm font-medium">
                    Or describe the tone
                  </label>
                  <Input id="tone" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
                  {brand?.toneOfVoice && <p className="text-xs text-muted-foreground">Brand voice on file: {brand.toneOfVoice}</p>}
                </div>
              </div>
            )}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button key={n} type="button" onClick={() => setForm({ ...form, emailCount: n })} aria-pressed={form.emailCount === n} className={cn("grid size-11 place-items-center rounded-xl border font-display text-lg transition-all", form.emailCount === n ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50")}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Three emails is the default: each gets a distinct strategic role.</p>
              </div>
            )}
            {step === 6 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Campaign name
                  </label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`${CAMPAIGN_TYPE_LABELS[form.type]} — ${brand?.name ?? ""}`} />
                </div>
                <dl className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">Brand</dt><dd className="font-medium">{brand?.name}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Type</dt><dd className="font-medium">{CAMPAIGN_TYPE_LABELS[form.type]}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Audience</dt><dd>{form.audience}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Goal</dt><dd>{form.goal}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Tone</dt><dd>{form.tone}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Emails</dt><dd>{form.emailCount}</dd></div>
                </dl>
                {brand && brand.readiness !== "ready" && (
                  <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                    <div>
                      <p className="font-medium">Research is {brand.readiness === "partial" ? "partially complete" : "insufficient"}.</p>
                      <p className="text-muted-foreground">
                        {brand.missingRequired.length ? `Missing: ${brand.missingRequired.join(", ")}. ` : ""}The brief will mark gaps with [placeholders] instead of inventing details. You can still plan and write manually.
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  The brief is planned by the studio's rule-based strategist (research validation → customer psychology → strategy → outline). No AI provider is contacted at this step.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
            <ArrowLeft /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button onClick={submit} disabled={pending} className="px-4">
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Campaign Brief
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
