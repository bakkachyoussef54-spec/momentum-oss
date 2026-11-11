"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeEmail } from "@/lib/analyzer";
import { EMPTY_PRODUCT, type BrandProfile } from "@/lib/types";
import { analyzeEmailAction } from "@/app/actions";
import { AnalysisReport } from "./analysis-report";

export function SaveAnalysisButton({ emailId }: { emailId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      onClick={() =>
        start(async () => {
          const res = await analyzeEmailAction(emailId);
          if (!res.ok) return void toast.error(res.error);
          toast.success(`Analysis saved (${res.data.totalScore}/100)`);
          router.refresh();
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Save />} Save analysis snapshot
    </Button>
  );
}

const BLANK_BRAND: BrandProfile = { name: "", website: "", instagramUrl: "", toneOfVoice: "", competitors: "", restrictions: "", researchNotes: "", product: EMPTY_PRODUCT };

/** Analyze pasted copy entirely in the browser — nothing is sent anywhere. */
export function AdHocAnalyzer({ brands }: { brands: { id: string; name: string; profile: BrandProfile }[] }) {
  const [brandId, setBrandId] = useState("");
  const [form, setForm] = useState({ subject: "", preview: "", body: "", cta: "", segment: "" });
  const brand = brands.find((b) => b.id === brandId)?.profile ?? BLANK_BRAND;
  const result = useMemo(
    () => (form.body.trim() ? analyzeEmail({ subjectLines: [form.subject], selectedSubject: 0, previewText: form.preview, hook: "", body: form.body, cta: form.cta, segment: form.segment }, brand) : null),
    [form, brand],
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="adhoc-brand" className="text-sm font-medium">Compare against brand (optional)</label>
          <select id="adhoc-brand" className="field-select" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">No brand context</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="adhoc-segment" className="text-sm font-medium">Audience segment</label>
          <Input id="adhoc-segment" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="adhoc-subject" className="text-sm font-medium">Subject line</label>
          <Input id="adhoc-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="adhoc-preview" className="text-sm font-medium">Preview text</label>
          <Input id="adhoc-preview" value={form.preview} onChange={(e) => setForm({ ...form, preview: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="adhoc-body" className="text-sm font-medium">Email copy</label>
          <Textarea id="adhoc-body" rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Paste the full email body…" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="adhoc-cta" className="text-sm font-medium">CTA</label>
          <Input id="adhoc-cta" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
        </div>
      </div>
      {result ? <AnalysisReport result={result} /> : <p className="text-center text-sm text-muted-foreground">Paste email copy above to see the analysis.</p>}
    </div>
  );
}
