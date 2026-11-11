"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshBriefAction, setCampaignStatusAction } from "@/app/actions";
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS } from "@/lib/constants";

export function CampaignControls({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="campaign-status" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </label>
        <select
          id="campaign-status"
          className="field-select w-40"
          value={status}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              const res = await setCampaignStatusAction(id, e.target.value);
              if (!res.ok) return void toast.error(res.error);
              toast.success("Status updated");
              router.refresh();
            })
          }
        >
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CAMPAIGN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="outline"
        className="h-9"
        disabled={pending}
        title="Re-plan strategy and warnings from the latest research. Email content is not changed."
        onClick={() =>
          start(async () => {
            const res = await refreshBriefAction(id);
            if (!res.ok) return void toast.error(res.error);
            toast.success("Brief refreshed from latest research");
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh brief
      </Button>
    </div>
  );
}
