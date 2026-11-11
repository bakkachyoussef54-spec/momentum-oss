"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ActionResult } from "@/app/actions";

/**
 * Archive (reversible) + permanent delete guarded by typing the exact name.
 */
export function DangerZone({
  entity,
  name,
  archived,
  onArchive,
  onDelete,
  redirectTo,
  consequences,
}: {
  entity: "brand" | "campaign";
  name: string;
  archived: boolean;
  onArchive: (archived: boolean) => Promise<ActionResult<string>>;
  onDelete: (confirmName: string) => Promise<ActionResult<null>>;
  redirectTo: string;
  consequences: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  const archive = () =>
    start(async () => {
      const res = await onArchive(!archived);
      if (!res.ok) return void toast.error(res.error);
      toast.success(archived ? `Restored ${entity}` : `Archived ${entity}. Restore it any time from Settings.`);
      if (!archived) router.push(redirectTo);
      else router.refresh();
    });

  const remove = () =>
    start(async () => {
      const res = await onDelete(confirm);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Deleted ${entity} permanently`);
      setOpen(false);
      router.push(redirectTo);
    });

  return (
    <div className="rounded-2xl border border-destructive/30 p-5">
      <h2 className="font-display text-base">Danger zone</h2>
      <p className="mt-1 text-sm text-muted-foreground">Archiving hides the {entity} but keeps every record. Deleting is permanent.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={archive} disabled={pending}>
          {archived ? <ArchiveRestore /> : <Archive />} {archived ? `Restore ${entity}` : `Archive ${entity}`}
        </Button>
        <Button variant="destructive" onClick={() => setOpen(true)} disabled={pending}>
          <Trash2 /> Delete permanently
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{name}” permanently?</DialogTitle>
            <DialogDescription>{consequences} This cannot be undone. Consider exporting a JSON backup from Settings first.</DialogDescription>
          </DialogHeader>
          <label htmlFor="confirm-delete" className="text-sm">
            Type <span className="font-semibold">{name}</span> to confirm
          </label>
          <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={confirm.trim() !== name || pending}>
              {pending && <Loader2 className="animate-spin" />} Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
