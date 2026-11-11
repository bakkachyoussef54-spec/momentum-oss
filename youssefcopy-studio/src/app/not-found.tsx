import { FileQuestion } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/common";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <EmptyState icon={FileQuestion} title="Not found" description="This record doesn't exist or was deleted." action={<ButtonLink href="/">Back to dashboard</ButtonLink>} />
    </div>
  );
}
