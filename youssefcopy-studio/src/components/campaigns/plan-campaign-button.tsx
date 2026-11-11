"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { planCampaignAction } from "@/app/actions";
import { CAMPAIGN_TYPE_LABELS, CAMPAIGN_TYPES } from "@/lib/constants";

/** One-click, rule-based three-email plan from the stored brand brief. */
export function PlanCampaignButton({ brandId, showType = true, size = "default" }: { brandId: string; showType?: boolean; size?: "default" | "sm" | "lg" }) {
  const router = useRouter();
  const [type, setType] = useState("welcome");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showType && (
        <>
          <label htmlFor={`plan-type-${brandId}`} className="sr-only">
            Campaign type
          </label>
          <select id={`plan-type-${brandId}`} className="field-select h-8 w-auto text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t} value={t}>
                {CAMPAIGN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </>
      )}
      <Button
        size={size}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await planCampaignAction(brandId, type);
            if (!res.ok) return void toast.error(res.error);
            toast.success("Three-email plan created from your brief");
            router.push(`/campaigns/${res.data}`);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Wand2 />} Plan 3-email campaign
      </Button>
    </div>
  );
}
