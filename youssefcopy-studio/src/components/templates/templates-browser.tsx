"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { applyTemplateAction, createTemplateAction, deleteTemplateAction } from "@/app/actions";
import { FRAMEWORKS, TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABELS, type TemplateCategory } from "@/lib/constants";

export interface TemplateView {
  id: string;
  name: string;
  category: string;
  goal: string;
  framework: string;
  outline: string[];
  subjectLines: string[];
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  personalization: string;
  isBuiltIn: boolean;
}

export function TemplatesBrowser({ templates, targets }: { templates: TemplateView[]; targets: { id: string; label: string; hasContent: boolean }[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<"all" | TemplateCategory>("all");
  const [open, setOpen] = useState<TemplateView | null>(null);
  const [target, setTarget] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState({ name: "", category: "welcome" as TemplateCategory, goal: "", framework: "AIDA", outline: "", subjectLines: "", previewText: "", hook: "", body: "", cta: "", personalization: "" });

  const visible = category === "all" ? templates : templates.filter((t) => t.category === category);

  const apply = () => {
    if (!open || !target) return;
    const t = targets.find((x) => x.id === target);
    if (t?.hasContent && !window.confirm("This email already has content. Replace it? The current draft is saved in version history first.")) return;
    start(async () => {
      const res = await applyTemplateAction(target, open.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Template applied");
      router.push(`/editor/${target}`);
    });
  };

  const create = () =>
    start(async () => {
      const res = await createTemplateAction({
        ...draft,
        outline: draft.outline.split("\n").map((s) => s.trim()).filter(Boolean),
        subjectLines: draft.subjectLines.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Template saved");
      setCreating(false);
      router.refresh();
    });

  const remove = (t: TemplateView) => {
    if (!window.confirm(`Delete template “${t.name}”?`)) return;
    start(async () => {
      const res = await deleteTemplateAction(t.id);
      if (!res.ok) return void toast.error(res.error);
      setOpen(null);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Template category" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-xs">
          {(["all", ...TEMPLATE_CATEGORIES] as const).map((c) => (
            <button key={c} role="tab" aria-selected={category === c} onClick={() => setCategory(c)} className={cn("rounded-md px-2.5 py-1.5 font-medium transition-colors", category === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {c === "all" ? "All" : TEMPLATE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New template
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t, i) => (
          <motion.button
            key={t.id}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            whileHover={{ y: -2 }}
            onClick={() => setOpen(t)}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{TEMPLATE_CATEGORY_LABELS[t.category as TemplateCategory] ?? t.category}</Badge>
              <Badge variant="outline">{t.framework}</Badge>
              {!t.isBuiltIn && <Badge variant="outline" className="border-dashed">Custom</Badge>}
            </div>
            <h2 className="mt-3 font-display text-base">{t.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.goal}</p>
            <p className="mt-4 line-clamp-2 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">{t.hook}</p>
          </motion.button>
        ))}
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription>
                  {open.framework} · {open.goal}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 text-sm sm:grid-cols-[1fr_1.3fr]">
                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outline</p>
                    <ol className="list-decimal space-y-1 pl-4">{open.outline.map((o) => <li key={o}>{o}</li>)}</ol>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personalization guidance</p>
                    <p className="text-muted-foreground">{open.personalization}</p>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example with placeholders</p>
                  <ul className="space-y-0.5">{open.subjectLines.map((s) => <li key={s}><span className="text-muted-foreground">Subject:</span> {s}</li>)}</ul>
                  <p><span className="text-muted-foreground">Preview:</span> {open.previewText}</p>
                  <p className="font-medium">{open.hook}</p>
                  <p className="whitespace-pre-line">{open.body}</p>
                  <p><span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white">{open.cta}</span></p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
                <div className="min-w-60 flex-1">
                  <label htmlFor="apply-target" className="mb-1.5 block text-xs font-medium text-muted-foreground">Apply to email</label>
                  <select id="apply-target" className="field-select" value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">{targets.length ? "Select an email…" : "Create a campaign first"}</option>
                    {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <Button onClick={apply} disabled={!target || pending}>
                  {pending && <Loader2 className="animate-spin" />} Apply template
                </Button>
                {!open.isBuiltIn && (
                  <Button variant="destructive" onClick={() => remove(open)} disabled={pending}>
                    <Trash2 /> Delete
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Placeholders are filled from the brand profile. Anything not on file stays as a visible [placeholder] — nothing is invented.</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>Use {"{{product_name}}"}, {"{{pain_point}}"}, {"{{core_benefit}}"}, {"{{objection}}"}, {"{{brand_name}}"} or {"{{usp}}"} as placeholders.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label="Template name" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Category" className="field-select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as TemplateCategory })}>
                {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{TEMPLATE_CATEGORY_LABELS[c]}</option>)}
              </select>
              <select aria-label="Framework" className="field-select" value={draft.framework} onChange={(e) => setDraft({ ...draft, framework: e.target.value })}>
                {FRAMEWORKS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <Textarea aria-label="Goal" className="sm:col-span-2" rows={2} placeholder="Goal" value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} />
            <Textarea aria-label="Outline" rows={4} placeholder="Outline (one step per line)" value={draft.outline} onChange={(e) => setDraft({ ...draft, outline: e.target.value })} />
            <Textarea aria-label="Subject lines" rows={4} placeholder="Subject lines (one per line)" value={draft.subjectLines} onChange={(e) => setDraft({ ...draft, subjectLines: e.target.value })} />
            <Input aria-label="Preview text" className="sm:col-span-2" placeholder="Preview text" value={draft.previewText} onChange={(e) => setDraft({ ...draft, previewText: e.target.value })} />
            <Input aria-label="Hook" className="sm:col-span-2" placeholder="Opening hook" value={draft.hook} onChange={(e) => setDraft({ ...draft, hook: e.target.value })} />
            <Textarea aria-label="Body" className="sm:col-span-2" rows={6} placeholder="Body" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <Input aria-label="CTA" placeholder="CTA" value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
            <Input aria-label="Personalization guidance" placeholder="Personalization guidance" value={draft.personalization} onChange={(e) => setDraft({ ...draft, personalization: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={create} disabled={!draft.name.trim() || pending}>
              {pending && <Loader2 className="animate-spin" />} Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
