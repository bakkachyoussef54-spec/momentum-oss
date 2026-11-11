import { ZodError } from "zod";
import { LIMITS } from "@/lib/constants";
import { exportBackup, importBackup } from "@/lib/services/backup";

export async function GET() {
  const data = await exportBackup();
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="youssefcopy-backup-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > LIMITS.backupBytes) return Response.json({ error: "Backup file is larger than 20 MB." }, { status: 413 });
  const text = await request.text();
  if (text.length > LIMITS.backupBytes) return Response.json({ error: "Backup file is larger than 20 MB." }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return Response.json({ error: "File is not valid JSON." }, { status: 400 });
  }
  try {
    const counts = await importBackup(json);
    return Response.json({ ok: true, counts });
  } catch (err) {
    if (err instanceof ZodError) return Response.json({ error: "This doesn't look like a YoussefCopy Studio backup (version 1)." }, { status: 400 });
    console.error("[backup import]", err);
    return Response.json({ error: "Import failed. No data was changed." }, { status: 500 });
  }
}
