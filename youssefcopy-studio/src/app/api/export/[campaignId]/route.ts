import { buildClientPackage } from "@/lib/services/export";
import { exportFileName, toMarkdown, toPlainText } from "@/lib/export/package";
import { toDocx } from "@/lib/export/docx";
import { logActivity } from "@/lib/services/settings";
import { db } from "@/lib/db";

const TYPES = {
  md: "text/markdown; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "md";
  if (!(format in TYPES)) return Response.json({ error: "Unsupported format" }, { status: 400 });
  let pkg;
  try {
    pkg = await buildClientPackage(campaignId);
  } catch {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }
  const f = format as keyof typeof TYPES;
  const body = f === "docx" ? new Uint8Array(await toDocx(pkg)) : f === "txt" ? toPlainText(pkg) : toMarkdown(pkg);
  const brand = await db.campaign.findUnique({ where: { id: campaignId }, select: { brandId: true } });
  await logActivity({ type: "export", message: `Exported client package for ${pkg.campaignName} (${f.toUpperCase()})`, entityType: "campaign", entityId: campaignId, brandId: brand?.brandId });
  return new Response(body, {
    headers: {
      "content-type": TYPES[f],
      "content-disposition": `attachment; filename="${exportFileName(pkg, f)}"`,
      "cache-control": "no-store",
    },
  });
}
