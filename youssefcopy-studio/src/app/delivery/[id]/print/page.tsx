import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/common";
import { PackagePreview } from "@/components/delivery/package-preview";
import { PrintButton } from "@/components/delivery/print-button";
import { buildClientPackage } from "@/lib/services/export";

export const metadata = { title: "Print package" };

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = await buildClientPackage(id).catch(() => null);
  if (!pkg) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <ButtonLink href={`/delivery?campaign=${id}`} variant="ghost">
          <ArrowLeft /> Back
        </ButtonLink>
        <PrintButton />
      </div>
      <div className="rounded-2xl bg-white p-8 text-[#0b0b0b] shadow-xl print:p-0 print:shadow-none">
        <PackagePreview pkg={pkg} />
      </div>
    </div>
  );
}
