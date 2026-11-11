"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clipboard,
  CloudOff,
  History,
  ListChecks,
  LayoutTemplate,
  Loader2,
  Monitor,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Text,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OriginBadge, timeAgo } from "@/components/common";
import { ScoreRing } from "@/components/analyzer/score-ring";
import { cn } from "@/lib/utils";
import { analyzeEmail, SCORE_DISCLAIMER } from "@/lib/analyzer";
import { wordCount } from "@/lib/json";
import { EMAIL_STATUSES, EMAIL_STATUS_LABELS } from "@/lib/constants";
import type { EmailSections } from "@/lib/validation";
import { composeBody, type AssistContext } from "@/lib/writing/assist";
import { GuidedWriter } from "./guided-writer";
import type { BrandProfile, ResearchItem } from "@/lib/types";
import { applyContentAction, applyTemplateAction, createVersionAction, restoreVersionAction, saveDraftAction, setEmailStatusAction } from "@/app/actions";

export interface EditorContent {
  subjectLines: string[];
  selectedSubject: number;
  previewText: string;
  hook: string;
  body: string;
  cta: string;
  rationale: string;
  researchRefs: string[];
  sections: EmailSections;
}

export interface EditorProps {
  email: {
    id: string;
    position: number;
    role: string;
    objective: string;
    framework: string;
    segment: string;
    status: string;
    contentOrigin: string;
    content: EditorContent;
  };
  campaign: { id: string; name: string; goal: string; audience: string; tone: string };
  sequence: { id: string; position: number; role: string; status: string; contentOrigin: string }[];
  versions: { id: string; versionNumber: number; origin: string; label: string; createdAt: string; subject: string; aiModel: string }[];
  brand: BrandProfile;
  research: ResearchItem[];
  templates: { id: string; name: string; category: string; framework: string }[];
  ai: { available: boolean; reason: string; model: string | null };
  plan: AssistContext["plan"];
}

const clockNow = () => Date.now();

type SaveState = "saved" | "dirty" | "saving" | "error";

const AI_ACTIONS = [
  { id: "improve_clarity", label: "Improve Clarity" },
  { id: "strengthen_hook", label: "Strengthen Hook" },
  { id: "more_conversational", label: "Make More Conversational" },
  { id: "focus_benefits", label: "Focus on Benefits" },
  { id: "improve_cta", label: "Improve CTA" },
  { id: "shorten", label: "Shorten Email" },
  { id: "subject_lines", label: "Generate Alternative Subject Lines" },
] as const;

interface Proposal {
  action: string;
  label: string;
  changes: Partial<Pick<EditorContent, "subjectLines" | "previewText" | "hook" | "body" | "cta">>;
  summary: string;
  usage?: { model: string; inputTokens: number | null; outputTokens: number | null; estimatedCostUsd: number | null };
}

export function plainTextEmail(c: EditorContent): string {
  const subject = c.subjectLines[c.selectedSubject] ?? "";
  return [`Subject: ${subject}`, `Preview: ${c.previewText}`, "", c.hook, "", c.body, "", `[${c.cta}]`].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function EmailEditor(props: EditorProps) {
  const { email, campaign, sequence, versions, brand, research, templates, ai, plan } = props;
  const assisted = useRef(false);
  const assistCtx = useMemo<AssistContext>(() => ({ brand, research, plan }), [brand, research, plan]);
  const router = useRouter();
  const [content, setContent] = useState<EditorContent>(() => ({
    ...email.content,
    subjectLines: email.content.subjectLines.length ? email.content.subjectLines : ["", "", ""],
  }));
  const [meta, setMeta] = useState({ objective: email.objective, segment: email.segment });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [view, setView] = useState<"guided" | "edit" | "desktop" | "mobile" | "text">(email.contentOrigin === "empty" || email.contentOrigin === "guided" ? "guided" : "edit");
  const [pending, start] = useTransition();
  const [confirmRestore, setConfirmRestore] = useState<EditorProps["versions"][number] | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const aiAbort = useRef<AbortController | null>(null);

  // Undo/redo of editor state, coalescing rapid keystrokes.
  const past = useRef<EditorContent[]>([]);
  const future = useRef<EditorContent[]>([]);
  const lastPush = useRef(0);
  const [hist, setHist] = useState({ past: 0, future: 0 });
  const syncHist = () => setHist({ past: past.current.length, future: future.current.length });

  const latest = useRef({ content, meta });
  useEffect(() => {
    latest.current = { content, meta };
  }, [content, meta]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);

  const persist = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current) await inflight.current;
    setSaveState("saving");
    const { content: c, meta: m } = latest.current;
    const p = saveDraftAction(email.id, c, m, assisted.current).then((res) => {
      if (res.ok) {
        setSaveState("saved");
        setLastSaved(new Date());
        return true;
      }
      setSaveState("error");
      toast.error(res.error);
      return false;
    });
    inflight.current = p;
    const ok = await p;
    inflight.current = null;
    return ok;
  }, [email.id]);

  const schedule = useCallback(() => {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), 1200);
  }, [persist]);

  const update = (patch: Partial<EditorContent>) => {
    const now = clockNow();
    if (now - lastPush.current > 800) {
      past.current.push(latest.current.content);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      lastPush.current = now;
      syncHist();
    }
    setContent((c) => ({ ...c, ...patch }));
    schedule();
  };

  const bodyLinked = !content.body.trim() || content.body === composeBody(content.sections);

  /** Section edits flow into the body while it is still built from sections (or empty). */
  const updateSections = (patch: Partial<EmailSections>) => {
    const cur = latest.current.content;
    const sections = { ...cur.sections, ...patch };
    const linked = !cur.body.trim() || cur.body === composeBody(cur.sections);
    update(linked ? { sections, body: composeBody(sections) } : { sections });
  };

  const rebuildBody = () => {
    if (!window.confirm("Replace the current body copy with steps 4–6 (problem, benefit, transition)? You can undo this.")) return;
    update({ body: composeBody(latest.current.content.sections) });
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(latest.current.content);
    setContent(prev);
    lastPush.current = 0;
    syncHist();
    schedule();
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(latest.current.content);
    setContent(next);
    lastPush.current = 0;
    syncHist();
    schedule();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist().then((ok) => ok && toast.success("Saved"));
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (timer.current || inflight.current) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
      if (timer.current) {
        clearTimeout(timer.current);
        void saveDraftAction(email.id, latest.current.content, latest.current.meta, assisted.current);
      }
      aiAbort.current?.abort();
    };
  }, [persist, email.id]);

  const analysis = useMemo(() => analyzeEmail({ ...content, segment: meta.segment }, brand, research), [content, meta.segment, brand, research]);
  const bodyWords = wordCount(`${content.hook} ${content.body}`);
  const subject = content.subjectLines[content.selectedSubject] ?? "";

  const withFlush = (fn: () => Promise<void>) =>
    start(async () => {
      const ok = saveState === "saved" ? true : await persist();
      if (!ok) return;
      await fn();
    });

  const saveVersion = () =>
    withFlush(async () => {
      const res = await createVersionAction(email.id, "Manual save");
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Saved as version ${res.data}`);
      router.refresh();
    });

  const restore = (v: EditorProps["versions"][number]) =>
    withFlush(async () => {
      const res = await restoreVersionAction(email.id, v.id);
      setConfirmRestore(null);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Restored v${v.versionNumber}. Your previous draft was kept in history.`);
      router.refresh();
    });

  const applyTemplate = () =>
    withFlush(async () => {
      const res = await applyTemplateAction(email.id, templateId);
      setConfirmTemplate(false);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Template applied. Previous draft saved in version history.");
      router.refresh();
    });

  const setStatus = (status: string) =>
    withFlush(async () => {
      const res = await setEmailStatusAction(email.id, status);
      if (!res.ok) return void toast.error(res.error);
      toast.success(status === "approved" ? "Approved — this version will be used in client exports." : `Marked ${EMAIL_STATUS_LABELS[status as keyof typeof EMAIL_STATUS_LABELS].toLowerCase()}`);
      router.refresh();
    });

  const runAi = async (action: (typeof AI_ACTIONS)[number]) => {
    if (!ai.available) return;
    aiAbort.current?.abort();
    const controller = new AbortController();
    aiAbort.current = controller;
    setAiBusy(action.id);
    try {
      const res = await fetch("/api/ai/revise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailId: email.id, action: action.id, current: { subjectLines: content.subjectLines, previewText: content.previewText, hook: content.hook, body: content.body, cta: content.cta } }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) return void toast.error(data.error ?? "AI request failed");
      const { changeSummary, ...changes } = data.proposal as Proposal["changes"] & { changeSummary: string };
      setProposal({ action: action.id, label: action.label, changes, summary: changeSummary, usage: data.usage });
    } catch (err) {
      if ((err as Error).name === "AbortError") toast.info("AI request cancelled");
      else toast.error("Could not reach the server");
    } finally {
      setAiBusy(null);
    }
  };

  const applyProposal = () => {
    if (!proposal) return;
    const merged: EditorContent = { ...latest.current.content };
    if (proposal.changes.subjectLines?.length) {
      if (proposal.action === "subject_lines") merged.subjectLines = [...merged.subjectLines.filter((s) => s.trim()), ...proposal.changes.subjectLines].slice(0, 10);
      else merged.subjectLines = proposal.changes.subjectLines;
    }
    for (const k of ["previewText", "hook", "body", "cta"] as const) {
      const v = proposal.changes[k];
      if (typeof v === "string" && v.trim()) merged[k] = v;
    }
    withFlush(async () => {
      const res = await applyContentAction(email.id, merged, `AI revision: ${proposal.label}`);
      setProposal(null);
      if (!res.ok) return void toast.error(res.error);
      toast.success("AI suggestion applied. The previous draft is in version history.");
      router.refresh();
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainTextEmail(content));
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Clipboard not available in this browser");
    }
  };

  const refOptions = [
    ...research.map((r) => `${r.title}${r.status === "verified" ? "" : ` (${r.status})`}`),
    ...(["description", "benefits", "painPoints", "features", "usp", "objections", "pricing"] as const).filter((k) => brand.product[k].trim()).map((k) => `Profile: ${k}`),
  ].filter((r) => !content.researchRefs.includes(r));

  const saveIndicator = {
    saved: { icon: Check, text: lastSaved ? `Saved ${timeAgo(lastSaved)}` : "All changes saved", cls: "text-muted-foreground" },
    dirty: { icon: PenLine, text: "Unsaved changes…", cls: "text-muted-foreground" },
    saving: { icon: Loader2, text: "Saving…", cls: "text-muted-foreground" },
    error: { icon: CloudOff, text: "Save failed — retry", cls: "text-destructive" },
  }[saveState];

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/campaigns/${campaign.id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {campaign.name}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="font-display text-xl">Email {email.position}: {email.role}</h1>
        <OriginBadge origin={email.contentOrigin} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span role="status" aria-live="polite" data-testid="save-status" className={cn("flex items-center gap-1.5 text-xs", saveIndicator.cls)}>
            <saveIndicator.icon className={cn("size-3.5", saveState === "saving" && "animate-spin")} /> {saveIndicator.text}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={undo} disabled={hist.past === 0} aria-label="Undo">
            <Undo2 />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={redo} disabled={hist.future === 0} aria-label="Redo">
            <Redo2 />
          </Button>
          <Button variant="outline" size="sm" onClick={copy}>
            <Clipboard /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={saveVersion} disabled={pending}>
            <Save /> Save version
          </Button>
          <label htmlFor="email-status" className="sr-only">
            Email status
          </label>
          <select id="email-status" className="field-select h-7 w-auto text-xs" value={email.status} onChange={(e) => setStatus(e.target.value)} disabled={pending}>
            {EMAIL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EMAIL_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: sequence + versions */}
        <aside className="order-2 space-y-5 lg:col-span-2 xl:order-none xl:col-span-1" aria-label="Sequence and versions">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sequence</p>
            <ol className="space-y-1">
              {sequence.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/editor/${s.id}`}
                    aria-current={s.id === email.id ? "page" : undefined}
                    className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors", s.id === email.id ? "bg-primary/10 font-medium" : "hover:bg-muted")}
                  >
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-md text-xs", s.status === "approved" ? "bg-success/20 text-success" : s.contentOrigin !== "empty" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{s.position}</span>
                    <span className="truncate">{s.role}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="size-3.5" /> Draft versions
            </p>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved versions yet. Use “Save version” to create a restore point.</p>
            ) : (
              <ol className="max-h-80 space-y-2 overflow-y-auto pr-1" data-testid="version-list">
                {versions.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">v{v.versionNumber}</span>
                      <OriginBadge origin={v.origin} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{v.label || "Snapshot"}</p>
                    {v.subject && <p className="mt-1 truncate">“{v.subject}”</p>}
                    <div className="mt-1.5 flex items-center justify-between text-muted-foreground">
                      <span>{timeAgo(v.createdAt)}</span>
                      <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => setConfirmRestore(v)} disabled={pending}>
                        <RotateCcw className="size-3" /> Restore
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>

        {/* Center: editor */}
        <section className="min-w-0 space-y-5" aria-label="Email content">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="tablist" aria-label="View mode" className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
              {(
                [
                  ["guided", "Guided", ListChecks],
                  ["edit", "Freeform", PenLine],
                  ["desktop", "Inbox preview", Monitor],
                  ["mobile", "Mobile", Smartphone],
                  ["text", "Plain text", Text],
                ] as const
              ).map(([id, label, Icon]) => (
                <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors", view === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="template-picker" className="sr-only">
                Apply template
              </label>
              <select id="template-picker" className="field-select h-8 w-48 text-xs" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Apply a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={!templateId || pending} onClick={() => setConfirmTemplate(true)}>
                <LayoutTemplate /> Apply
              </Button>
            </div>
          </div>

          {view === "guided" ? (
            <GuidedWriter
              content={content}
              ctx={assistCtx}
              bodyLinked={bodyLinked}
              onChange={(patch) => update(patch)}
              onSections={updateSections}
              onAssist={() => {
                assisted.current = true;
              }}
              onRebuildBody={rebuildBody}
            />
          ) : view === "edit" ? (
            <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Subject lines <span className="font-normal text-muted-foreground">— select the primary option</span></legend>
                {content.subjectLines.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="primary-subject" aria-label={`Use subject line ${i + 1}`} checked={content.selectedSubject === i} onChange={() => update({ selectedSubject: i })} className="size-4 accent-[#0057FF]" />
                    <Input
                      aria-label={`Subject line ${i + 1}`}
                      value={s}
                      maxLength={150}
                      onChange={(e) => {
                        const next = [...content.subjectLines];
                        next[i] = e.target.value;
                        update({ subjectLines: next });
                      }}
                      placeholder={`Subject option ${i + 1}`}
                    />
                    <span className={cn("w-10 shrink-0 text-right text-xs tabular-nums", s.length > 60 ? "text-warning" : "text-muted-foreground")}>{s.length}</span>
                    {content.subjectLines.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove subject line ${i + 1}`}
                        onClick={() => {
                          const next = content.subjectLines.filter((_, j) => j !== i);
                          update({ subjectLines: next, selectedSubject: Math.min(content.selectedSubject >= i && content.selectedSubject > 0 ? content.selectedSubject - 1 : content.selectedSubject, next.length - 1) });
                        }}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                ))}
                {content.subjectLines.length < 10 && (
                  <Button variant="ghost" size="xs" onClick={() => update({ subjectLines: [...content.subjectLines, ""] })}>
                    <Plus /> Add option
                  </Button>
                )}
              </fieldset>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label htmlFor="previewText" className="text-sm font-medium">Preview text</label>
                  <span className={cn("text-xs tabular-nums", content.previewText.length > 110 ? "text-warning" : "text-muted-foreground")}>{content.previewText.length}/110</span>
                </div>
                <Input id="previewText" value={content.previewText} maxLength={200} onChange={(e) => update({ previewText: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="hook" className="text-sm font-medium">Opening hook</label>
                <Textarea id="hook" rows={2} value={content.hook} onChange={(e) => update({ hook: e.target.value })} className="text-[15px]" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label htmlFor="body" className="text-sm font-medium">Body copy</label>
                  <span className="text-xs tabular-nums text-muted-foreground" data-testid="word-count">
                    {bodyWords} words · {(content.hook + content.body).length} characters · ~{Math.max(1, Math.round(bodyWords / 230))} min read
                  </span>
                </div>
                <Textarea id="body" rows={16} value={content.body} onChange={(e) => update({ body: e.target.value })} className="min-h-80 font-[450] text-[15px] leading-7" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="cta" className="text-sm font-medium">Primary CTA</label>
                  <Input id="cta" value={content.cta} maxLength={200} onChange={(e) => update({ cta: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="segment" className="text-sm font-medium">Recommended segment</label>
                  <Input
                    id="segment"
                    value={meta.segment}
                    onChange={(e) => {
                      setMeta((m) => ({ ...m, segment: e.target.value }));
                      schedule();
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rationale" className="text-sm font-medium">Strategic rationale</label>
                <Textarea id="rationale" rows={3} value={content.rationale} onChange={(e) => update({ rationale: e.target.value })} placeholder="Why this angle, structure and CTA — included in the client package." />
              </div>
            </div>
          ) : view === "text" ? (
            <pre className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-6 font-mono text-sm leading-6">{plainTextEmail(content)}</pre>
          ) : (
            <div className={cn("mx-auto overflow-hidden rounded-2xl border border-border bg-white text-[#0b0b0b] shadow-2xl shadow-black/20", view === "mobile" ? "max-w-[390px]" : "max-w-[680px]")} data-testid="email-preview">
              <div className="border-b border-[#eaeaea] bg-[#fafafa] px-5 py-4">
                <p className="text-xs text-[#5f5f66]">From: {brand.name}</p>
                <p className="mt-1 font-semibold">{subject || "(no subject)"}</p>
                <p className="truncate text-sm text-[#5f5f66]">{content.previewText}</p>
              </div>
              <div className={cn("space-y-4 leading-7", view === "mobile" ? "px-5 py-6 text-[15px]" : "px-10 py-8 text-base")}>
                {content.hook && <p className="font-medium">{content.hook}</p>}
                {content.body.split(/\n\s*\n/).filter(Boolean).map((p, i) => (
                  <p key={i} className="whitespace-pre-line">{p}</p>
                ))}
                {content.cta && (
                  <p className="pt-2">
                    <span className="inline-block rounded-lg bg-[#0057FF] px-5 py-3 font-semibold text-white">{content.cta}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right: context, quality, AI */}
        <aside className="order-3 space-y-5" aria-label="Research and quality">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Objective</p>
            <Textarea
              aria-label="Email objective"
              rows={2}
              value={meta.objective}
              onChange={(e) => {
                setMeta((m) => ({ ...m, objective: e.target.value }));
                schedule();
              }}
              className="text-sm"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Framework: <span className="font-medium text-foreground">{email.framework}</span> · Campaign goal: {campaign.goal}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4" data-testid="quality-panel">
            <div className="flex items-center gap-4">
              <ScoreRing score={analysis.totalScore} size={72} />
              <div>
                <p className="font-display text-sm">Quality score</p>
                <p className="text-xs text-muted-foreground">Heuristic editorial assessment</p>
                <Link href={`/analyzer?email=${email.id}`} className="text-xs text-primary hover:underline">Full analysis →</Link>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {analysis.breakdown.map((b) => (
                <li key={b.key} className="text-xs">
                  <div className="flex justify-between"><span>{b.label}</span><span className="tabular-nums text-muted-foreground">{b.score}/{b.max}</span></div>
                  <div className="mt-1 h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${(b.score / b.max) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            {analysis.flags.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {analysis.flags.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex gap-1.5 text-xs">
                    <CircleAlert className={cn("mt-0.5 size-3.5 shrink-0", f.severity === "high" ? "text-destructive" : f.severity === "medium" ? "text-warning" : "text-muted-foreground")} />
                    <span><span className="font-medium">{f.label}.</span> <span className="text-muted-foreground">{f.detail}</span></span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top weaknesses</p>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
                {analysis.weaknesses.map((w) => (
                  <li key={w.title}>
                    <span className="font-medium text-foreground">{w.title}.</span> {w.suggestion}
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground/80">{SCORE_DISCLAIMER}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research references</p>
            {content.researchRefs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No references yet. Link the facts this email relies on.</p>
            ) : (
              <ul className="space-y-1">
                {content.researchRefs.map((r) => (
                  <li key={r} className="flex items-start justify-between gap-2 text-xs">
                    <span>{r}</span>
                    <button aria-label={`Remove reference ${r}`} onClick={() => update({ researchRefs: content.researchRefs.filter((x) => x !== r) })} className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {refOptions.length > 0 && (
              <select aria-label="Add research reference" className="field-select mt-3 h-8 text-xs" value="" onChange={(e) => e.target.value && update({ researchRefs: [...content.researchRefs, e.target.value] })}>
                <option value="">+ Add reference…</option>
                {refOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground">Verified facts on file ({research.filter((r) => r.status === "verified").length})</summary>
              <ul className="mt-2 space-y-2">
                {research.filter((r) => r.status === "verified").map((r) => (
                  <li key={r.id}><span className="font-medium">{r.title}:</span> <span className="text-muted-foreground">{r.content.slice(0, 220)}</span></li>
                ))}
              </ul>
            </details>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5" /> AI actions
            </p>
            {ai.available ? (
              <p className="mb-3 text-xs text-muted-foreground">Sends this draft and the brand’s verified research to {ai.model}. You review every suggestion before it’s applied.</p>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground">Unavailable: {ai.reason} Everything else in the editor works without AI.</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {AI_ACTIONS.map((a) => (
                <Button key={a.id} variant="outline" size="xs" disabled={!ai.available || Boolean(aiBusy) || pending} onClick={() => runAi(a)}>
                  {aiBusy === a.id && <Loader2 className="animate-spin" />} {a.label}
                </Button>
              ))}
            </div>
            {aiBusy && (
              <Button variant="ghost" size="xs" className="mt-2" onClick={() => aiAbort.current?.abort()}>
                <X /> Cancel request
              </Button>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={Boolean(confirmRestore)} onOpenChange={(o) => !o && setConfirmRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore version {confirmRestore?.versionNumber}?</DialogTitle>
            <DialogDescription>Your current draft will be saved as a new version first, so nothing is lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>Cancel</Button>
            <Button onClick={() => confirmRestore && restore(confirmRestore)} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmTemplate} onOpenChange={setConfirmTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply template?</DialogTitle>
            <DialogDescription>
              This replaces the subject lines, preview text, hook, body and CTA with “{templates.find((t) => t.id === templateId)?.name}”, filled from the brand profile. Your current draft is saved in version history first. Unknown details appear as [placeholders].
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTemplate(false)}>Cancel</Button>
            <Button onClick={applyTemplate} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Apply template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(proposal)} onOpenChange={(o) => !o && setProposal(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI suggestion: {proposal?.label}</DialogTitle>
            <DialogDescription>
              {proposal?.summary || "Review the proposed changes."} Nothing changes until you apply it.
              {proposal?.usage?.inputTokens != null && ` · ${proposal.usage.inputTokens + (proposal.usage.outputTokens ?? 0)} tokens`}
              {proposal?.usage?.estimatedCostUsd != null && ` · ~$${proposal.usage.estimatedCostUsd.toFixed(4)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto">
            {proposal &&
              (Object.entries(proposal.changes) as [keyof Proposal["changes"], unknown][])
                .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim()))
                .map(([k, v]) => (
                  <div key={k} className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/60 p-3 text-sm">
                      <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Current {k}</p>
                      <p className="whitespace-pre-line text-muted-foreground">{Array.isArray(content[k]) ? (content[k] as string[]).join("\n") : (content[k] as string)}</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3 text-sm ring-1 ring-primary/20">
                      <p className="mb-1 text-xs uppercase tracking-wider text-primary">Suggested {k}</p>
                      <p className="whitespace-pre-line">{Array.isArray(v) ? v.join("\n") : String(v)}</p>
                    </div>
                  </div>
                ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposal(null)}>Discard</Button>
            <Button onClick={applyProposal} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {proposal?.action === "subject_lines" ? "Add subject lines" : "Apply suggestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
