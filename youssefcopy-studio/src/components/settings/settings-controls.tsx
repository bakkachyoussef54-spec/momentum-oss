"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArchiveRestore, Download, FlaskConical, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { archiveBrandAction, archiveCampaignAction, loadDemoAction, removeDemoAction, setAiEnabledAction } from "@/app/actions";
import { LIMITS } from "@/lib/constants";

export function AiToggle({ enabled, configured }: { enabled: boolean; configured: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-3 text-sm">
      <Switch
        checked={enabled}
        disabled={pending}
        onCheckedChange={(v: boolean) =>
          start(async () => {
            const res = await setAiEnabledAction(v);
            if (!res.ok) return void toast.error(res.error);
            toast.success(v ? "AI features enabled" : "AI features disabled");
            router.refresh();
          })
        }
        aria-label="Enable AI features"
      />
      {enabled ? "AI features enabled" : "AI features disabled"}
      {!configured && <span className="text-xs text-muted-foreground">(no provider configured — the toggle takes effect once one is)</span>}
    </label>
  );
}

export function BackupControls() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > LIMITS.backupBytes) return void toast.error("Backup file is larger than 20 MB.");
    if (!window.confirm("Import this backup? Records are merged by ID: matching records are updated, nothing is deleted.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: await file.text() });
      const data = await res.json();
      if (!res.ok) return void toast.error(data.error ?? "Import failed");
      toast.success(`Imported ${data.counts.brands} brands, ${data.counts.campaigns} campaigns, ${data.counts.emails} emails`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a href="/api/backup" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
        <Download className="size-4" /> Export JSON backup
      </a>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-label="Import backup file" />
      <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />} Import backup
      </Button>
    </div>
  );
}

export function DemoControls({ hasDemo }: { hasDemo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return hasDemo ? (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Remove all demo records (brand, research, campaign, drafts)? Your real records are not affected.")) return;
        start(async () => {
          const res = await removeDemoAction();
          if (!res.ok) return void toast.error(res.error);
          toast.success("Demo data removed");
          router.refresh();
        });
      }}
    >
      <Trash2 /> Remove demo data
    </Button>
  ) : (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await loadDemoAction();
          if (!res.ok) return void toast.error(res.error);
          toast.success("Demo brand loaded");
          router.push(`/brands/${res.data}`);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <FlaskConical />} Load demo data
    </Button>
  );
}

export function RestoreButton({ kind, id }: { kind: "brand" | "campaign"; id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = kind === "brand" ? await archiveBrandAction(id, false) : await archiveCampaignAction(id, false);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Restored");
          router.refresh();
        })
      }
    >
      <ArchiveRestore /> Restore
    </Button>
  );
}

