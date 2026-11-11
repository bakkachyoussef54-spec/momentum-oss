"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ClipboardPaste, Loader2, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, SectionCard } from "@/components/common";
import { createBrandAction, updateBrandAction } from "@/app/actions";
import { parseBriefText } from "@/lib/research/paste-parser";
import type { BrandInput } from "@/lib/validation";

export const EMPTY_BRAND: BrandInput = {
  name: "",
  website: "",
  instagramUrl: "",
  toneOfVoice: "",
  competitors: "",
  restrictions: "",
  researchNotes: "",
  product: { name: "", category: "", description: "", targetAudience: "", painPoints: "", desires: "", features: "", benefits: "", usp: "", testimonials: "", objections: "", pricing: "" },
};

type ProductKey = keyof BrandInput["product"];
type BrandKey = Exclude<keyof BrandInput, "product">;

const PRODUCT_FIELDS: { key: ProductKey; label: string; hint?: string; multiline?: boolean; rows?: number }[] = [
  { key: "name", label: "Product name" },
  { key: "category", label: "Product category", hint: "e.g. Sleep accessories, Recovery, Supplements" },
  { key: "description", label: "Product description", multiline: true, rows: 3 },
  { key: "targetAudience", label: "Target audience", multiline: true, rows: 3 },
  { key: "painPoints", label: "Customer pain points", hint: "One per line", multiline: true },
  { key: "desires", label: "Customer desires", hint: "One per line", multiline: true },
  { key: "features", label: "Product features", hint: "One per line", multiline: true },
  { key: "benefits", label: "Product benefits (verified)", hint: "Only benefits the client can substantiate. One per line.", multiline: true },
  { key: "usp", label: "Unique selling proposition", multiline: true, rows: 2 },
  { key: "testimonials", label: "Testimonials or reviews", hint: "Paste real, attributable reviews only. Add the source in Research and mark it verified.", multiline: true },
  { key: "objections", label: "Purchase objections", hint: "One per line", multiline: true },
  { key: "pricing", label: "Pricing & promotional details", hint: "Exact prices, offers and end dates approved by the client. Leave blank if none.", multiline: true, rows: 2 },
];

export function BrandForm({ brandId, initial }: { brandId?: string; initial: BrandInput }) {
  const router = useRouter();
  const [form, setForm] = useState<BrandInput>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const setBrand = (key: BrandKey, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setProduct = (key: ProductKey, value: string) => setForm((f) => ({ ...f, product: { ...f.product, [key]: value } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = brandId ? await updateBrandAction(brandId, form) : await createBrandAction(form);
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(brandId ? "Brand saved" : "Brand created");
      if (!brandId) router.push(`/brands/${res.data}`);
      else router.refresh();
    });
  };

  const applyPaste = () => {
    const { fields, unmatched } = parseBriefText(pasteText);
    let filled = 0;
    setForm((f) => {
      const next: BrandInput = { ...f, product: { ...f.product } };
      for (const [key, value] of Object.entries(fields)) {
        if (!value) continue;
        filled++;
        if (key.startsWith("product.")) {
          const k = key.slice(8) as ProductKey;
          next.product[k] = next.product[k] ? `${next.product[k]}\n${value}` : value;
        } else {
          const k = key as BrandKey;
          next[k] = k === "name" || k === "website" || k === "instagramUrl" ? value.split("\n")[0] : next[k] ? `${next[k]}\n${value}` : value;
        }
      }
      if (unmatched) next.researchNotes = next.researchNotes ? `${next.researchNotes}\n${unmatched}` : unmatched;
      return next;
    });
    setPasteOpen(false);
    setPasteText("");
    toast.success(filled ? `Filled ${filled} field(s). Review before saving.` : "No headings recognized — text added to research notes.");
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Have a client brief in a doc? Paste it and the studio fills matching fields — nothing is invented.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
          <ClipboardPaste /> Paste from document
        </Button>
      </div>

      <SectionCard title="Brand" description="Who the client is and how they sound.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name *" htmlFor="name">
            <Input id="name" value={form.name} onChange={(e) => setBrand("name", e.target.value)} required maxLength={200} aria-invalid={error?.startsWith("name") || undefined} />
          </Field>
          <Field label="Brand website" htmlFor="website" hint="https://…">
            <Input id="website" type="url" value={form.website} onChange={(e) => setBrand("website", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Instagram URL" htmlFor="instagramUrl">
            <Input id="instagramUrl" type="url" value={form.instagramUrl} onChange={(e) => setBrand("instagramUrl", e.target.value)} placeholder="https://instagram.com/…" />
          </Field>
          <Field label="Competitors" htmlFor="competitors">
            <Input id="competitors" value={form.competitors} onChange={(e) => setBrand("competitors", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Brand tone of voice" htmlFor="toneOfVoice">
              <Textarea id="toneOfVoice" rows={2} value={form.toneOfVoice} onChange={(e) => setBrand("toneOfVoice", e.target.value)} placeholder="e.g. Calm, reassuring, quietly premium. Short sentences. No exclamation marks." />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Brand restrictions" htmlFor="restrictions" hint='Words, claims or topics to avoid. Quote banned words, e.g. Never say "cure".'>
              <Textarea id="restrictions" rows={2} value={form.restrictions} onChange={(e) => setBrand("restrictions", e.target.value)} />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Product & customer" description="Client-provided facts. Leave fields blank rather than guessing — the studio will warn about gaps.">
        <div className="grid gap-4 sm:grid-cols-2">
          {PRODUCT_FIELDS.map((f) => (
            <div key={f.key} className={f.multiline ? "sm:col-span-2" : undefined}>
              <Field label={f.label} htmlFor={`product-${f.key}`} hint={f.hint}>
                {f.multiline ? (
                  <Textarea id={`product-${f.key}`} rows={f.rows ?? 3} value={form.product[f.key]} onChange={(e) => setProduct(f.key, e.target.value)} />
                ) : (
                  <Input id={`product-${f.key}`} value={form.product[f.key]} onChange={(e) => setProduct(f.key, e.target.value)} />
                )}
              </Field>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Research notes" description="Free-form notes. Add individual sources with URLs and verified/hypothesis status in Brand Research.">
        <Textarea id="researchNotes" aria-label="Research notes" rows={4} value={form.researchNotes} onChange={(e) => setBrand("researchNotes", e.target.value)} />
      </SectionCard>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="size-4" /> {error}
        </p>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="h-10 px-5 shadow-lg shadow-primary/20">
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {brandId ? "Save changes" : "Create brand"}
        </Button>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paste from document</DialogTitle>
            <DialogDescription>
              Use headings like “Target Audience:” or “## Benefits”. Matching text fills the form; anything unrecognized goes to research notes. You review everything before saving.
            </DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Pasted brief" rows={12} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"Brand: Lunora Sleep\nProduct: Contour Sleep Mask\nTarget Audience: Light-sensitive sleepers…\nPain Points:\n- Early sunrise wakes them\n- Flat masks press on the eyes"} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyPaste} disabled={!pasteText.trim()}>
              Fill fields
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
