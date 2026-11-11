import Link from "next/link";
import { PenLine } from "lucide-react";
import { ButtonLink, EmptyState, OriginBadge, PageHeader, StatusBadge } from "@/components/common";
import { db } from "@/lib/db";
import { parseStringArray } from "@/lib/json";

export const metadata = { title: "Email Editor" };

export default async function EditorIndexPage() {
  const campaigns = await db.campaign.findMany({
    where: { archivedAt: null, brand: { archivedAt: null } },
    orderBy: { updatedAt: "desc" },
    include: { brand: { select: { name: true } }, emails: { orderBy: { position: "asc" } } },
  });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Professional Email Editor" title="Email Editor" description="Pick an email to edit. Autosave, version history and live quality feedback are built in." />
      {campaigns.length === 0 ? (
        <EmptyState icon={PenLine} title="Nothing to edit yet" description="Create a campaign — each strategic email slot appears here." action={<ButtonLink href="/campaigns/new">Create New Campaign</ButtonLink>} />
      ) : (
        <div className="space-y-6">
          {campaigns.map((c) => (
            <section key={c.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="font-display text-base">{c.name}</h2>
                <span className="text-xs text-muted-foreground">{c.brand.name}</span>
              </div>
              <ul className="divide-y divide-border">
                {c.emails.map((e) => {
                  const subject = parseStringArray(e.subjectLines)[e.selectedSubject];
                  return (
                    <li key={e.id}>
                      <Link href={`/editor/${e.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{e.position}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{e.role}</span>
                          <span className="block truncate text-xs text-muted-foreground">{subject || "Not written yet"}</span>
                        </span>
                        <span className="hidden sm:block"><OriginBadge origin={e.contentOrigin} /></span>
                        <StatusBadge kind="email" status={e.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
