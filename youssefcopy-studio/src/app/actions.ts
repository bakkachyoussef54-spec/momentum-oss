"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { formatZodError, type BrandInput, type CampaignInput, type ResearchInput } from "@/lib/validation";
import * as brands from "@/lib/services/brands";
import * as campaigns from "@/lib/services/campaigns";
import * as emails from "@/lib/services/emails";
import * as templates from "@/lib/services/templates";
import * as demo from "@/lib/services/demo";
import { setSetting, logActivity } from "@/lib/services/settings";
import { LIMITS } from "@/lib/constants";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const SAFE_PREFIXES = ["Brand not found", "Campaign not found", "Email not found", "Confirmation text", "Cannot approve", "Built-in templates", "Campaign brief"];

async function run<T>(fn: () => Promise<T>, paths: string[] = []): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    for (const p of paths) revalidatePath(p, "layout");
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: formatZodError(err) };
    const message = err instanceof Error ? err.message : "";
    if (SAFE_PREFIXES.some((p) => message.startsWith(p))) return { ok: false, error: message };
    console.error("[action]", err);
    return { ok: false, error: "Something went wrong while saving. Your previous data is unchanged." };
  }
}

// Brands
export async function createBrandAction(input: BrandInput) {
  return run(async () => (await brands.createBrand(input)).id, ["/"]);
}
export async function updateBrandAction(id: string, input: BrandInput) {
  return run(async () => (await brands.updateBrand(id, input)).id, ["/"]);
}
export async function archiveBrandAction(id: string, archived: boolean) {
  return run(async () => (await brands.setBrandArchived(id, archived)).id, ["/"]);
}
export async function deleteBrandAction(id: string, confirmName: string) {
  return run(() => brands.deleteBrand(id, confirmName).then(() => null), ["/"]);
}

// Research
export async function addResearchAction(input: ResearchInput) {
  return run(async () => {
    const item = await brands.addResearch(input);
    return { id: item.id, flagged: item.flags !== "[]" };
  }, ["/"]);
}
export async function updateResearchAction(id: string, input: ResearchInput) {
  return run(async () => (await brands.updateResearch(id, input)).id, ["/"]);
}
export async function setResearchStatusAction(id: string, status: "verified" | "hypothesis" | "unreviewed") {
  return run(async () => (await brands.setResearchStatus(id, status)).id, ["/"]);
}
export async function deleteResearchAction(id: string) {
  return run(() => brands.deleteResearch(id).then(() => null), ["/"]);
}
/** Text import: content arrives as text (read client-side); no file is executed or stored on disk. */
export async function importResearchDocumentAction(input: { brandId: string; fileName: string; content: string }) {
  return run(async () => {
    if (input.content.length > LIMITS.researchContent) throw new Error("Document too large");
    const item = await brands.addResearch({
      brandId: input.brandId,
      title: `Imported: ${input.fileName.replace(/[^\w .-]/g, "").slice(0, 120) || "document"}`,
      url: "",
      kind: "document",
      category: "general",
      content: input.content.replace(/\u0000/g, ""),
      status: "unreviewed",
    });
    return { id: item.id, flagged: item.flags !== "[]" };
  }, ["/"]);
}

// Campaigns
export async function createCampaignAction(input: CampaignInput) {
  return run(async () => (await campaigns.createCampaign(input)).id, ["/"]);
}
export async function refreshBriefAction(id: string) {
  return run(() => campaigns.refreshBrief(id).then(() => null), ["/"]);
}
export async function setCampaignStatusAction(id: string, status: string) {
  return run(async () => (await campaigns.setCampaignStatus(id, status)).id, ["/"]);
}
export async function archiveCampaignAction(id: string, archived: boolean) {
  return run(async () => (await campaigns.setCampaignArchived(id, archived)).id, ["/"]);
}
export async function deleteCampaignAction(id: string, confirmName: string) {
  return run(() => campaigns.deleteCampaign(id, confirmName).then(() => null), ["/"]);
}

// Emails
export async function saveDraftAction(emailId: string, content: unknown, meta?: unknown) {
  return run(async () => (await emails.saveDraft(emailId, content, meta)).updatedAt.toISOString());
}
export async function createVersionAction(emailId: string, label: string) {
  return run(async () => (await emails.createVersion(emailId, label)).versionNumber, ["/editor"]);
}
export async function restoreVersionAction(emailId: string, versionId: string) {
  return run(async () => (await emails.restoreVersion(emailId, versionId)).versionNumber, ["/"]);
}
export async function applyTemplateAction(emailId: string, templateId: string) {
  return run(async () => (await emails.applyTemplateToEmail(emailId, templateId)).versionNumber, ["/"]);
}
export async function applyContentAction(emailId: string, content: unknown, label: string) {
  return run(async () => (await emails.replaceContent(emailId, content, { origin: "ai_edited", label: label.slice(0, 120) })).versionNumber, ["/"]);
}
export async function setEmailStatusAction(emailId: string, status: string) {
  return run(async () => (await emails.setEmailStatus(emailId, status)).status, ["/"]);
}
export async function analyzeEmailAction(emailId: string) {
  return run(() => emails.analyzeAndStore(emailId), ["/analyzer"]);
}

// Templates
export async function createTemplateAction(input: unknown) {
  return run(async () => (await templates.createTemplate(input)).id, ["/templates"]);
}
export async function deleteTemplateAction(id: string) {
  return run(() => templates.deleteTemplate(id).then(() => null), ["/templates"]);
}

// Settings
export async function setAiEnabledAction(enabled: boolean) {
  return run(async () => {
    await setSetting("aiEnabled", enabled ? "true" : "false");
    await logActivity({ type: "settings.ai", message: `AI features ${enabled ? "enabled" : "disabled"}` });
    return enabled;
  }, ["/"]);
}
export async function loadDemoAction() {
  return run(async () => (await demo.loadDemoData()).id, ["/"]);
}
export async function removeDemoAction() {
  return run(() => demo.removeDemoData(), ["/"]);
}
