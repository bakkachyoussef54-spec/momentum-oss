import Link from "next/link";
import { PenLine } from "lucide-react";
import { ButtonLink, PageHeader, SectionCard, timeAgo } from "@/components/common";
import { AnalysisReport } from "@/components/analyzer/analysis-report";
import { AdHocAnalyzer, SaveAnalysisButton } from "@/components/analyzer/analyzer-tools";
import { QueryPicker } from "@/components/query-picker";
import { analyzeEmail } from "@/lib/analyzer";
import { db } from "@/lib/db";
import { getEmail } from "@/lib/services/emails";
import { listBrands } from "@/lib/services/brands";
import { emailContentOf, toBrandProfile, toResearchItem } from "@/lib/services/mappers";

export const metadata = { title: "Copywriting Analyzer" };

export default async function AnalyzerPage({ searchParams }: { searchParams: Promise<{ email?: string; mode?: string }> }) {
  const { email: emailId, mode } = await searchParams;
  const emails = await db.campaignEmail.findMany({
    where: { campaign: { archivedAt: null, brand: { archivedAt: null } }, contentOrigin: { not: "empty" } },
    orderBy: [{ campaign: { updatedAt: "desc" } }, { position: "asc" }],
    include: { campaign: { select: { name: true, brand: { select: { name: true } } } } },
  });
  const email = emailId ? await getEmail(emailId) : null;
  const adHoc = mode === "paste";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Copywriting Quality Analyzer"
        title="Copywriting Analyzer"
        description="Transparent advisory scoring out of 100 — Audience 20 · Clarity 20 · Benefits 20 · Persuasiveness 15 · CTA 10 · Specificity 10 · Voice 5."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            {!adHoc && <QueryPicker param="email" label="Email" value={email?.id ?? ""} placeholder="Select an email…" options={emails.map((e) => ({ value: e.id, label: `${e.campaign.brand.name} · ${e.campaign.name} · #${e.position}` }))} />}
            <ButtonLink href={adHoc ? "/analyzer" : "/analyzer?mode=paste"} variant="outline" className="h-9">
              {adHoc ? "Analyze saved emails" : "Paste copy instead"}
            </ButtonLink>
          </div>
        }
      />
      {adHoc ? (
        <AdHocAnalyzer brands={(await listBrands()).map((b) => ({ id: b.id, name: b.name, profile: toBrandProfile(b) }))} />
      ) : !email ? (
        <SectionCard>
          <p className="py-10 text-center text-sm text-muted-foreground">
            {emails.length ? "Select a written email above, or paste any copy for a quick check." : "No written emails yet. Write one in the editor or paste copy to analyze."}
          </p>
        </SectionCard>
      ) : (
        <EmailAnalysis email={email} />
      )}
    </div>
  );
}

async function EmailAnalysis({ email }: { email: NonNullable<Awaited<ReturnType<typeof getEmail>>> }) {
  const content = emailContentOf(email);
  const result = analyzeEmail({ ...content, segment: email.segment }, toBrandProfile(email.campaign.brand), email.campaign.brand.researchSources.map(toResearchItem));
  const history = await db.copywritingAnalysis.findMany({ where: { emailId: email.id }, orderBy: { createdAt: "desc" }, take: 6 });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{email.campaign.name} · Email {email.position}</p>
          <p className="font-display text-lg">{content.subjectLines[content.selectedSubject] || email.role}</p>
        </div>
        <div className="flex gap-2">
          <SaveAnalysisButton emailId={email.id} />
          <ButtonLink href={`/editor/${email.id}`}>
            <PenLine /> Edit email
          </ButtonLink>
        </div>
      </div>
      <AnalysisReport result={result} />
      {history.length > 0 && (
        <SectionCard title="Saved analysis history">
          <ul className="flex flex-wrap gap-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-lg border border-border px-3 py-1.5 text-sm">
                <span className="font-semibold tabular-nums">{h.totalScore}</span> <span className="text-xs text-muted-foreground">· {timeAgo(h.createdAt)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Snapshots let you compare revisions. <Link href={`/editor/${email.id}`} className="text-primary hover:underline">Back to editor</Link>
          </p>
        </SectionCard>
      )}
    </div>
  );
}
