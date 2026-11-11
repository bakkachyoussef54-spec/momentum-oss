import { humanReviewRecommendations, type ClientPackage } from "@/lib/export/package";
import { CAMPAIGN_TYPE_LABELS, type CampaignType } from "@/lib/constants";

/** Read-only rendering of the client package, used for on-screen preview and print/PDF. */
export function PackagePreview({ pkg }: { pkg: ClientPackage }) {
  return (
    <article className="space-y-8 text-[15px] leading-7" data-testid="package-preview">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0057FF]">YoussefCopy Studio · Client package</p>
        <h1 className="mt-2 font-display text-3xl">{pkg.brandName} — {pkg.campaignName}</h1>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="inline font-semibold">Campaign type: </dt><dd className="inline">{CAMPAIGN_TYPE_LABELS[pkg.campaignType as CampaignType] ?? pkg.campaignType}</dd></div>
          <div><dt className="inline font-semibold">Tone: </dt><dd className="inline">{pkg.tone}</dd></div>
          <div className="sm:col-span-2"><dt className="inline font-semibold">Objective: </dt><dd className="inline">{pkg.objective}</dd></div>
          <div className="sm:col-span-2"><dt className="inline font-semibold">Target audience: </dt><dd className="inline">{pkg.audience}</dd></div>
        </dl>
      </header>
      <section>
        <h2 className="font-display text-xl">Campaign strategy</h2>
        <p className="mt-2">{pkg.strategy}</p>
      </section>
      {pkg.emails.map((e) => {
        const subject = e.subjectLines[e.selectedSubject] ?? e.subjectLines[0] ?? "";
        return (
          <section key={e.position} className="break-inside-avoid-page border-t border-current/10 pt-6">
            <h2 className="font-display text-xl">
              Email {e.position} — {e.role}
              {!e.approved && <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wider text-[#b54708]">Draft · not approved</span>}
            </h2>
            <p className="mt-1 text-sm opacity-70">{e.objective} · {e.framework} · Segment: {e.segment}</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="font-semibold">Subject:</span> {subject || "—"}</p>
              {e.subjectLines.filter((_, i) => i !== e.selectedSubject).filter(Boolean).map((s) => (
                <p key={s} className="opacity-70">Alternative: {s}</p>
              ))}
              <p><span className="font-semibold">Preview text:</span> {e.previewText || "—"}</p>
            </div>
            <div className="mt-4 space-y-3">
              {e.hook && <p className="font-medium">{e.hook}</p>}
              {e.body.split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
              <p><span className="font-semibold">CTA:</span> {e.cta || "—"}</p>
            </div>
            {e.rationale && <p className="mt-3 text-sm"><span className="font-semibold">Rationale:</span> {e.rationale}</p>}
            {e.researchRefs.length > 0 && <p className="mt-2 text-sm opacity-70">References: {e.researchRefs.join("; ")}</p>}
          </section>
        );
      })}
      {pkg.researchNotes.length > 0 && (
        <section className="border-t border-current/10 pt-6">
          <h2 className="font-display text-xl">Supporting research notes</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{pkg.researchNotes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      )}
      <section className="border-t border-current/10 pt-6">
        <h2 className="font-display text-xl">Recommendations for human review</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{humanReviewRecommendations(pkg).map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </article>
  );
}
