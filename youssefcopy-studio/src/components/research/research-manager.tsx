"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ExternalLink, FileUp, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SectionCard, StatusBadge } from "@/components/common";
import { addResearchAction, deleteResearchAction, importResearchDocumentAction, setResearchStatusAction } from "@/app/actions";
import { LIMITS, RESEARCH_CATEGORIES, RESEARCH_CATEGORY_LABELS, RESEARCH_STATUS_LABELS, RESEARCH_STATUSES, type ResearchCategory, type ResearchStatus } from "@/lib/constants";

interface Item {
  id: string;
  title: string;
  url: string;
  kind: string;
  category: string;
  content: string;
  status: string;
  flagged: boolean;
}

const ACCEPTED = [".txt", ".md", ".markdown", ".csv"];

export function ResearchManager({ brandId, items }: { brandId: string; items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ title: "", url: "", category: "general" as ResearchCategory, content: "", status: "unreviewed" as ResearchStatus });
  const [filter, setFilter] = useState<"all" | ResearchStatus>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await addResearchAction({ brandId, kind: form.url ? "url" : "note", ...form });
      if (!res.ok) return void toast.error(res.error);
      if (res.data.flagged) toast.warning("Saved. Some text looks like instructions to an AI — those lines will be withheld from prompts.");
      else toast.success("Research saved");
      setForm({ title: "", url: "", category: "general", content: "", status: "unreviewed" });
      router.refresh();
    });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED.includes(ext)) return void toast.error("Only plain-text documents (.txt, .md, .csv) can be imported.");
    if (file.size > LIMITS.importFileBytes) return void toast.error("File is larger than 1 MB.");
    const text = await file.text();
    if (text.length > LIMITS.researchContent) return void toast.error(`Document has more than ${LIMITS.researchContent.toLocaleString()} characters — split it into smaller parts.`);
    start(async () => {
      const res = await importResearchDocumentAction({ brandId, fileName: file.name, content: text });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.data.flagged ? "Imported — some lines look like AI instructions and will be withheld from prompts." : "Document imported as unreviewed research");
      router.refresh();
    });
  };

  const setStatus = (id: string, status: ResearchStatus) =>
    start(async () => {
      const res = await setResearchStatusAction(id, status);
      if (!res.ok) return void toast.error(res.error);
      router.refresh();
    });

  const remove = (id: string, title: string) => {
    if (!window.confirm(`Delete research “${title}”? This cannot be undone.`)) return;
    start(async () => {
      const res = await deleteResearchAction(id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Research deleted");
      router.refresh();
    });
  };

  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Add research"
        description="Each item is a single fact, review, note or source. Mark it verified only when you've confirmed it with the client or a primary source."
        actions={
          <>
            <input ref={fileRef} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={onFile} aria-label="Import text document" />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={pending}>
              <FileUp /> Import document
            </Button>
          </>
        }
      >
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *" htmlFor="r-title">
            <Input id="r-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Return policy page" />
          </Field>
          <Field label="Source URL" htmlFor="r-url">
            <Input id="r-url" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="Category" htmlFor="r-category">
            <select id="r-category" className="field-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ResearchCategory })}>
              {RESEARCH_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {RESEARCH_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Evidence status" htmlFor="r-status">
            <select id="r-status" className="field-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ResearchStatus })}>
              {RESEARCH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {RESEARCH_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Content" htmlFor="r-content" hint="Quote the source exactly where possible.">
              <Textarea id="r-content" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={pending || !form.title.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />} Save research
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={`Research library (${items.length})`}
        actions={
          <div role="tablist" aria-label="Filter by status" className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
            {(["all", ...RESEARCH_STATUSES] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={filter === s}
                onClick={() => setFilter(s)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${filter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s === "all" ? "All" : RESEARCH_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        }
      >
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No research items {filter !== "all" ? "with this status" : "yet"}.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li key={item.id} className="rounded-xl border border-border p-4" data-testid="research-item">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {RESEARCH_CATEGORY_LABELS[item.category as ResearchCategory] ?? item.category} · {item.kind}
                      {item.url && (
                        <>
                          {" · "}
                          <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary hover:underline">
                            source <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <StatusBadge kind="research" status={item.status} />
                </div>
                {item.flagged && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                    <ShieldAlert className="size-3.5" /> Contains text that looks like instructions to an AI system. Those lines are withheld from AI prompts.
                  </p>
                )}
                {item.content && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{item.content}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`status-${item.id}`}>
                    Evidence status
                  </label>
                  <select id={`status-${item.id}`} className="field-select h-8 w-auto text-xs" value={item.status} onChange={(e) => setStatus(item.id, e.target.value as ResearchStatus)} disabled={pending}>
                    {RESEARCH_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {RESEARCH_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => remove(item.id, item.title)} disabled={pending} aria-label={`Delete ${item.title}`}>
                    <Trash2 /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
