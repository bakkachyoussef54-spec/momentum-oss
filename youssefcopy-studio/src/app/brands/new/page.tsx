import { PageHeader } from "@/components/common";
import { BrandForm, EMPTY_BRAND } from "@/components/brands/brand-form";

export const metadata = { title: "New brand" };

export default function NewBrandPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Brand Knowledge Hub" title="New brand" description="Only enter information the client has provided or you have verified. Gaps are fine — the studio will flag them instead of inventing details." />
      <BrandForm initial={EMPTY_BRAND} />
    </div>
  );
}
