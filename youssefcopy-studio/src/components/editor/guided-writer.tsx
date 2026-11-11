"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Info, Link2, Link2Off, ListChecks, Plus, RefreshCw, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { STEP_GUIDES, WRITING_STEPS, stepComplete, suggestionsFor, type AssistContext, type WritingStep } from "@/lib/writing/assist";
import type { EmailSections } from "@/lib/validation";

export interface GuidedContent {
  subjectLines: string[];
  selectedSubject: number;
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  rationale: string;
  sections: EmailSections;
}

export function GuidedWriter({
  content,
  ctx,
  bodyLinked,
  onChange,
  onSections,
  onAssist,
  onRebuildBody,
}: {
  content: GuidedContent;
  ctx: AssistContext;
  bodyLinked: boolean;
  onChange: (patch: Partial<GuidedContent>) => void;
  onSections: (patch: Partial<EmailSections>) => void;
  onAssist: () => void;
  onRebuildBody: () => void;
}) {
  const firstOpen = WRITING_STEPS.find((s) => !stepComplete(s, content)) ?? "subject";
  const [step, setStep] = useState<WritingStep>(firstOpen);
  const idx = WRITING_STEPS.indexOf(step);
  const guide = STEP_GUIDES[step];
  const suggestions = useMemo(() => suggestionsFor(step, ctx), [step, ctx]);
  const doneCount = WRITING_STEPS.filter((s) => stepComplete(s, content)).length;

  const current = (): string => {
    if (step === "problem" || step === "benefit" || step === "transition") return content.sections[step];
    if (step === "preview") return content.previewText;
    if (step === "subject") return "";
    return content[step];
  };

  const setValue = (value: string) => {
    if (step === "problem" || step === "benefit" || step === "transition") onSections({ [step]: value });
    else if (step === "preview") onChange({ previewText: value });
    else if (step === "hook" || step === "cta" || step === "rationale") onChange({ [step]: value });
  };

  const applySuggestion = (text: string) => {
    if (step === "subject") {
      const lines = [...content.subjectLines];
      const empty = lines.findIndex((s) => !s.trim());
      if (empty >= 0) lines[empty] = text;
      else if (lines.length < 10) lines.push(text);
      else return;
      onChange({ subjectLines: lines });
      onAssist();
      return;
    }
    const existing = current();
    if (existing.trim() && existing.trim() !== text && !window.confirm("Replace your current text for this step? You can undo with the Undo button.")) return;
    setValue(text);
    onAssist();
  };

  return (
    <div className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6 2xl:grid-cols-[190px_minmax(0,1fr)]" data-testid="guided-writer">
      <nav aria-label="Writing steps">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListChecks className="size-3.5" /> {doneCount}/{WRITING_STEPS.length} steps
        </p>
        <ol className="flex gap-1 overflow-x-auto pb-1 2xl:flex-col 2xl:pb-0">
          {WRITING_STEPS.map((s, i) => {
            const done = stepComplete(s, content);
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

        {/* Field */}
        {step === "subject" ? (
          <fieldset className="space-y-2">
            <legend className="sr-only">Subject lines</legend>
            {content.subjectLines.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="guided-primary-subject" aria-label={`Use subject line ${i + 1}`} checked={content.selectedSubject === i} onChange={() => onChange({ selectedSubject: i })} className="size-4 accent-[#0057FF]" />
                <Input
                  aria-label={`Guided subject line ${i + 1}`}
                  value={s}
                  maxLength={150}
                  placeholder={`Subject option ${i + 1}`}
                  onChange={(e) => {
                    const next = [...content.subjectLines];
                    next[i] = e.target.value;
                    onChange({ subjectLines: next });
                  }}
                />
                <span className={cn("w-8 shrink-0 text-right text-xs tabular-nums", s.length > 50 ? "text-warning" : "text-muted-foreground")}>{s.length}</span>
                {content.subjectLines.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove guided subject line ${i + 1}`}
                    onClick={() => {
                      const next = content.subjectLines.filter((_, j) => j !== i);
                      onChange({ subjectLines: next, selectedSubject: Math.min(content.selectedSubject > i ? content.selectedSubject - 1 : content.selectedSubject, next.length - 1) });
                    }}
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}
            {content.subjectLines.length < 10 && (
              <Button variant="ghost" size="xs" onClick={() => onChange({ subjectLines: [...content.subjectLines, ""] })}>
                <Plus /> Add option
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Write three different angles and pick the primary one. All three go into the client package.</p>
          </fieldset>
        ) : step === "preview" || step === "cta" ? (
          <Input aria-label={guide.title} value={current()} maxLength={200} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <Textarea aria-label={guide.title} rows={step === "hook" ? 2 : 5} value={current()} onChange={(e) => setValue(e.target.value)} className="text-[15px] leading-7" />
        )}

        {(step === "problem" || step === "benefit" || step === "transition") && (
          <div className={cn("flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs", bodyLinked ? "bg-muted/60 text-muted-foreground" : "bg-warning/10 text-warning")} data-testid="body-link-status">
            {bodyLinked ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
            {bodyLinked ? "Body copy is built from steps 4–6 automatically." : "Body copy was edited directly, so steps 4–6 no longer update it."}
            {!bodyLinked && (
              <Button variant="outline" size="xs" onClick={onRebuildBody}>
                <RefreshCw /> Rebuild body from steps
              </Button>
            )}
          </div>
        )}

        {/* Rule-based suggestions */}
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Wand2 className="size-3.5" /> Rule-based suggestions
          </p>
          <p className="mb-3 text-xs text-muted-foreground">Assembled by fixed rules from your verified brief — not written by AI. Edit freely; [brackets] mark missing details.</p>
          <ul className="space-y-2" data-testid="guided-suggestions">
            {suggestions.map((s) => (
              <li key={s.text} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{s.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">From: {s.basis}</p>
                </div>
                <Button size="xs" variant="outline" onClick={() => applySuggestion(s.text)}>
                  Use
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* Guidance */}
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example structures</p>
            <ul className="space-y-2.5">
              {guide.structures.map((st) => (
                <li key={st.name}>
                  <p className="font-medium">{st.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{st.pattern}</p>
                  <p className="mt-0.5 italic text-muted-foreground">“{st.example}”</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-success">Do</p>
              <ul className="space-y-1 text-muted-foreground">{guide.tips.map((t) => <li key={t}>• {t}</li>)}</ul>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-destructive">Avoid</p>
              <ul className="space-y-1 text-muted-foreground">{guide.avoid.map((t) => <li key={t}>• {t}</li>)}</ul>
            </div>
            {step === "cta" && ctx.plan?.ctaStrategy && (
              <p className="flex gap-1.5 rounded-lg bg-primary/5 p-2 text-xs"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" /> Plan: {ctx.plan.ctaStrategy}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setStep(WRITING_STEPS[Math.max(0, idx - 1)])} disabled={idx === 0}>
            <ArrowLeft /> Previous
          </Button>
          {idx < WRITING_STEPS.length - 1 ? (
            <Button onClick={() => setStep(WRITING_STEPS[idx + 1])}>
              Next: {STEP_GUIDES[WRITING_STEPS[idx + 1]].title} <ArrowRight />
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{doneCount === WRITING_STEPS.length ? "All steps done — review the preview, then approve." : "Fill the remaining steps, then approve."}</p>
          )}
        </div>
      </section>
    </div>
  );
}
