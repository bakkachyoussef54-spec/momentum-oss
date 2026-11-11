"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl pt-10">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="The page couldn't load. Your saved data is safe. If this keeps happening, check that the database is migrated (npm run db:migrate)."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
