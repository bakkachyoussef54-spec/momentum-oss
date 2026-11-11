"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Dumbbell, GraduationCap, Link2, Link2Off, ListChecks, Plus, RefreshCw, ShieldCheck, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FRAMEWORKS, FRAMEWORK_DESCRIPTIONS } from "@/lib/constants";
import {
  benefitOptions,
  FRAMEWORK_PARTS,
  isFramework,
  painOptions,
  STEP_GUIDES,
  stepComplete,
  suggestionsFor,
  WRITING_STEPS,
  type AssistContext,
  type BodyPart,
  type StepState,
  type Suggestion,
  type WritingStep,
} from "@/lib/writing/assist";
import type { EmailSections } from "@/lib/validation";

export interface ReviewInfo {
  checks: { label: string; ok: boolean }[];
  weaknesses: { title: string; suggestion: string; severity: string }[];
  highFlags: number;
  placeholders: boolean;
}

interface Props {
  state: StepState;
  ctx: AssistContext;
  brandId: string;
  bodyLinked: boolean;
  review: ReviewInfo;
  busy: boolean;
  onChange: (patch: Partial<Pick<StepState, "subjectLines" | "selectedSubject" | "previewText" | "hook" | "cta" | "rationale" | "body">>) => void;
  onMeta: (patch: Partial<Pick<StepState, "objective" | "segment" | "framework">>) => void;
  onSections: (patch: Partial<EmailSections>) => void;
  onAssist: () => void;
  onRebuildBody: () => void;
  onApprove: () => void;
}

function SuggestionList({ items, onUse }: { items: Suggestion[]; onUse: (s: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Wand2 className="size-3.5" /> Rule-based suggestions
      </p>
      <p className="mb-3 text-xs text-muted-foreground">Assembled by fixed rules from your verified brief — not written by AI. Edit freely; [brackets] mark missing details.</p>
      <ul className="space-y-2" data-testid="guided-suggestions">
        {items.map((s) => (
          <li key={s.text} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm">{s.text}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">From: {s.basis}</p>
            </div>
            <Button size="xs" variant="outline" onClick={() => onUse(s.text)}>
              Use
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChoiceList({ name, options, value, onPick, empty }: { name: string; options: string[]; value: string; onPick: (v: string) => void; empty: React.ReactNode }) {
  if (!options.length) return <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning">{empty}</div>;
  return (
    <div role="radiogroup" aria-label={name} className="space-y-2" data-testid={`choice-${name.toLowerCase().replace(/\s+/g, "-")}`}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onPick(o)}
          className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors", value === o ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50")}
        >
          <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ring-1", value === o ? "bg-primary ring-primary" : "ring-border")}>{value === o && <Check className="size-3 text-white" />}</span>
          {o}
        </button>
      ))}
    </div>
  );
}

export function GuidedWriter({ state, ctx, brandId, bodyLinked, review, busy, onChange, onMeta, onSections, onAssist, onRebuildBody, onApprove }: Props) {
  const firstOpen = WRITING_STEPS.find((s) => !stepComplete(s, state)) ?? "objective";
  const [step, setStep] = useState<WritingStep>(firstOpen);
  const idx = WRITING_STEPS.indexOf(step);
  const guide = STEP_GUIDES[step];
  const fullCtx: AssistContext = useMemo(
    () => ({ ...ctx, chosen: { pain: state.sections.painPoint, benefit: state.sections.benefitPoint, framework: state.framework } }),
    [ctx, state.sections.painPoint, state.sections.benefitPoint, state.framework],
  );
  const suggestions = useMemo(() => (step === "body" ? [] : suggestionsFor(step, fullCtx)), [step, fullCtx]);
  const doneCount = WRITING_STEPS.filter((s) => stepComplete(s, state)).length;
  const pains = useMemo(() => painOptions(ctx.brand, ctx.research), [ctx.brand, ctx.research]);
  const benefits = useMemo(() => benefitOptions(ctx.brand, ctx.research), [ctx.brand, ctx.research]);
  const fw = isFramework(state.framework) ? state.framework : null;
  const parts = fw ? FRAMEWORK_PARTS[fw] : { problem: "Problem & context", benefit: "Product benefit", transition: "Persuasive transition", outline: "" };

  const confirmReplace = (existing: string, text: string) => !existing.trim() || existing.trim() === text || window.confirm("Replace your current text for this step? You can undo with the Undo button.");

  const useText = (text: string, target: WritingStep | BodyPart) => {
    switch (target) {
      case "subject": {
        const lines = [...state.subjectLines];
        const empty = lines.findIndex((s) => !s.trim());
        if (empty >= 0) lines[empty] = text;
        else if (lines.length < 10) lines.push(text);
        else return;
        onChange({ subjectLines: lines });
        break;
      }
      case "objective":
        if (!confirmReplace(state.objective, text)) return;
        onMeta({ objective: text });
        break;
      case "audience":
        if (!confirmReplace(state.segment, text)) return;
        onMeta({ segment: text });
        break;
      case "preview":
        if (!confirmReplace(state.previewText, text)) return;
        onChange({ previewText: text });
        break;
      case "problem":
      case "transition":
        if (!confirmReplace(state.sections[target], text)) return;
        onSections({ [target]: text });
        break;
      case "benefit":
        if (!confirmReplace(state.sections.benefit, text)) return;
        onSections({ benefit: text });
        break;
      case "hook":
      case "cta":
      case "rationale":
        if (!confirmReplace(state[target], text)) return;
        onChange({ [target]: text });
        break;
      default:
        return;
    }
    onAssist();
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6 2xl:grid-cols-[200px_minmax(0,1fr)]" data-testid="guided-writer">
      <nav aria-label="Writing steps" className="min-w-0">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListChecks className="size-3.5" /> {doneCount}/{WRITING_STEPS.length} steps
        </p>
        <ol className="flex gap-1 overflow-x-auto pb-1 2xl:flex-col 2xl:pb-0">
          {WRITING_STEPS.map((s, i) => {
            const done = stepComplete(s, state);
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => setStep(s)}
                  aria-current={s === step ? "step" : undefined}
                  data-testid={`guided-step-${s}`}
                  className={cn("flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2 py-1.5 text-left text-sm transition-colors", s === step ? "bg-primary/10 font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                >
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold", done ? "bg-success text-white" : "ring-1 ring-border")}>{done ? <Check className="size-3" /> : i + 1}</span>
                  {STEP_GUIDES[s].title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="min-w-0 space-y-5" aria-labelledby="guided-step-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step {idx + 1} of {WRITING_STEPS.length}</p>
          <h2 id="guided-step-title" className="mt-0.5 font-display text-xl">{guide.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{guide.purpose}</p>
        </div>

        {/* Writing coach */}
        <aside className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/15" aria-label="Writing coach" data-testid="writing-coach">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <GraduationCap className="size-3.5" /> Writing coach · why it matters
          </p>
          <p className="text-sm">{guide.why}</p>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Tips, pitfalls & a 2-minute exercise</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">Do</p>
                <ul className="space-y-1 text-muted-foreground">{guide.tips.map((t) => <li key={t}>• {t}</li>)}</ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-destructive">Avoid</p>
                <ul className="space-y-1 text-muted-foreground">{guide.avoid.map((t) => <li key={t}>• {t}</li>)}</ul>
              </div>
            </div>
            <p className="mt-3 flex gap-1.5 text-muted-foreground"><Dumbbell className="mt-0.5 size-3.5 shrink-0 text-primary" /> <span><span className="font-medium text-foreground">Exercise:</span> {guide.exercise}</span></p>
          </details>
        </aside>

        {/* Step field */}
        {step === "objective" && <Textarea aria-label="Email objective" rows={3} value={state.objective} onChange={(e) => onMeta({ objective: e.target.value })} />}
        {step === "audience" && <Textarea aria-label="Target audience segment" rows={2} value={state.segment} onChange={(e) => onMeta({ segment: e.target.value })} />}
        {step === "pain" && (
          <ChoiceList
            name="Primary pain point"
            options={pains}
            value={state.sections.painPoint}
            onPick={(v) => onSections({ painPoint: v })}
            empty={<>No pain points in the brief yet. <Link className="underline" href={`/brands/${brandId}`}>Add them to the brand profile</Link>.</>}
          />
        )}
        {step === "benefit" && (
          <>
            <ChoiceList
              name="Verified benefit"
              options={benefits}
              value={state.sections.benefitPoint}
              onPick={(v) => onSections({ benefitPoint: v })}
              empty={<>No verified benefits yet. <Link className="underline" href={`/brands/${brandId}`}>Add client-provided benefits</Link> or mark benefit research as verified.</>}
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-success" /> Only benefits from the brand profile or verified research can be chosen.</p>
          </>
        )}
        {step === "framework" && (
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Framework" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {FRAMEWORKS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={state.framework === f}
                  title={FRAMEWORK_DESCRIPTIONS[f]}
                  onClick={() => onMeta({ framework: f })}
                  className={cn("rounded-xl border p-3 text-left text-sm transition-colors", state.framework === f ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50")}
                >
                  <span className="flex items-center justify-between gap-2 font-medium">
                    {f}
                    {ctx.plan?.framework === f && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">Plan</span>}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{FRAMEWORK_DESCRIPTIONS[f]}</span>
                </button>
              ))}
            </div>
            {ctx.plan?.frameworkReason && <p className="text-xs text-muted-foreground">Why the plan suggests {ctx.plan.framework}: {ctx.plan.frameworkReason}</p>}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="framework-outline" className="text-sm font-medium">Your outline (editable)</label>
                {fw && (
                  <Button variant="ghost" size="xs" onClick={() => onSections({ outline: FRAMEWORK_PARTS[fw].outline.split(" → ").map((x, i) => `${i + 1}. ${x}`).join("\n") })}>
                    Use {fw} outline
                  </Button>
                )}
              </div>
              <Textarea id="framework-outline" rows={4} value={state.sections.outline} onChange={(e) => onSections({ outline: e.target.value })} placeholder={fw ? FRAMEWORK_PARTS[fw].outline : "Choose a framework, then sketch the outline"} />
            </div>
          </div>
        )}
        {step === "subject" && (
          <fieldset className="space-y-2">
            <legend className="sr-only">Subject lines</legend>
            {state.subjectLines.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="guided-primary-subject" aria-label={`Use subject line ${i + 1}`} checked={state.selectedSubject === i} onChange={() => onChange({ selectedSubject: i })} className="size-4 accent-[#0057FF]" />
                <Input
                  aria-label={`Guided subject line ${i + 1}`}
                  value={s}
                  maxLength={150}
                  placeholder={`Subject option ${i + 1}`}
                  onChange={(e) => {
                    const next = [...state.subjectLines];
                    next[i] = e.target.value;
                    onChange({ subjectLines: next });
                  }}
                />
                <span className={cn("w-8 shrink-0 text-right text-xs tabular-nums", s.length > 50 ? "text-warning" : "text-muted-foreground")}>{s.length}</span>
                {state.subjectLines.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove guided subject line ${i + 1}`}
                    onClick={() => {
                      const next = state.subjectLines.filter((_, j) => j !== i);
                      onChange({ subjectLines: next, selectedSubject: Math.min(state.selectedSubject > i ? state.selectedSubject - 1 : state.selectedSubject, next.length - 1) });
                    }}
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}
            {state.subjectLines.length < 10 && (
              <Button variant="ghost" size="xs" onClick={() => onChange({ subjectLines: [...state.subjectLines, ""] })}>
                <Plus /> Add option
              </Button>
            )}
          </fieldset>
        )}
        {step === "preview" && <Input aria-label="Preview text" value={state.previewText} maxLength={200} onChange={(e) => onChange({ previewText: e.target.value })} />}
        {step === "hook" && <Textarea aria-label="Opening hook" rows={2} value={state.hook} onChange={(e) => onChange({ hook: e.target.value })} className="text-[15px] leading-7" />}
        {step === "body" && (
          <div className="space-y-4">
            {(["problem", "benefit", "transition"] as const).map((part) => {
              const sug = suggestionsFor(part, fullCtx);
              return (
                <div key={part} className="space-y-1.5">
                  <label htmlFor={`part-${part}`} className="text-sm font-medium">{parts[part]}</label>
                  <Textarea id={`part-${part}`} rows={3} value={state.sections[part]} onChange={(e) => onSections({ [part]: e.target.value })} className="text-[15px] leading-7" />
                  {sug[0] && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Wand2 className="mt-0.5 size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">Rule-based: “{sug[0].text}”</span>
                      <Button size="xs" variant="outline" onClick={() => useText(sug[0].text, part)} data-testid={`use-part-${part}`}>Use</Button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className={cn("flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs", bodyLinked ? "bg-muted/60 text-muted-foreground" : "bg-warning/10 text-warning")} data-testid="body-link-status">
              {bodyLinked ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
              {bodyLinked ? "The body copy is built from these parts automatically." : "The body was edited directly (Freeform or AI), so these parts no longer update it."}
              {!bodyLinked && (
                <Button variant="outline" size="xs" onClick={onRebuildBody}>
                  <RefreshCw /> Rebuild body from parts
                </Button>
              )}
            </div>
          </div>
        )}
        {step === "cta" && <Input aria-label="Primary CTA" value={state.cta} maxLength={200} onChange={(e) => onChange({ cta: e.target.value })} />}
        {step === "rationale" && <Textarea aria-label="Strategic rationale" rows={4} value={state.rationale} onChange={(e) => onChange({ rationale: e.target.value })} />}
        {step === "review" && (
          <div className="space-y-4" data-testid="guided-review">
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
              {review.checks.map((c) => (
                <li key={c.label} className={cn("flex items-center gap-2", !c.ok && "text-warning")}>
                  {c.ok ? <Check className="size-4 text-success" /> : <CircleAlert className="size-4" />} {c.label}
                </li>
              ))}
              <li className={cn("flex items-center gap-2", review.placeholders && "text-warning")}>
                {review.placeholders ? <CircleAlert className="size-4" /> : <Check className="size-4 text-success" />} No [placeholders] left
              </li>
              <li className={cn("flex items-center gap-2", review.highFlags > 0 && "text-warning")}>
                {review.highFlags > 0 ? <CircleAlert className="size-4" /> : <Check className="size-4 text-success" />} No high-severity quality flags
              </li>
            </ul>
            {review.weaknesses.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top weaknesses (heuristic)</p>
                <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                  {review.weaknesses.map((w) => <li key={w.title}><span className="font-medium text-foreground">{w.title}.</span> {w.suggestion}</li>)}
                </ol>
              </div>
            )}
            {state.status === "approved" ? (
              <p className="flex items-center gap-2 text-sm font-medium text-success"><ShieldCheck className="size-4" /> Approved — this version goes into the client package.</p>
            ) : (
              <Button onClick={onApprove} disabled={busy} data-testid="guided-approve">
                <ShieldCheck /> Approve this email
              </Button>
            )}
          </div>
        )}

        <SuggestionList items={suggestions} onUse={(t) => useText(t, step)} />

        {guide.structures.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example structures</p>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {guide.structures.map((st) => (
                <li key={st.name} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{st.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{st.pattern}</p>
                  <p className="mt-0.5 italic text-muted-foreground">“{st.example}”</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setStep(WRITING_STEPS[Math.max(0, idx - 1)])} disabled={idx === 0}>
            <ArrowLeft /> Previous
          </Button>
          {idx < WRITING_STEPS.length - 1 && (
            <Button onClick={() => setStep(WRITING_STEPS[idx + 1])} data-testid="guided-next">
              Next: {STEP_GUIDES[WRITING_STEPS[idx + 1]].title} <ArrowRight />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
