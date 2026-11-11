import { detectPromptInjection } from "../compliance";
import { db } from "../db";
import { brandInputSchema, researchInputSchema, type BrandInput, type ResearchInput } from "../validation";
import { logActivity } from "./settings";

export async function listBrands(opts: { includeArchived?: boolean } = {}) {
  return db.brand.findMany({
    where: opts.includeArchived ? {} : { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { products: { take: 1, orderBy: { createdAt: "asc" } }, _count: { select: { campaigns: true, researchSources: true } } },
  });
}

export async function getBrand(id: string) {
  return db.brand.findUnique({
    where: { id },
    include: {
      products: { take: 1, orderBy: { createdAt: "asc" } },
      researchSources: { orderBy: { createdAt: "desc" } },
      campaigns: { where: { archivedAt: null }, orderBy: { updatedAt: "desc" } },
    },
  });
}

export async function createBrand(raw: BrandInput, opts: { isDemo?: boolean } = {}) {
  const input = brandInputSchema.parse(raw);
  const { product, ...brand } = input;
  const created = await db.brand.create({
    data: { ...brand, isDemo: opts.isDemo ?? false, products: { create: product } },
  });
  await logActivity({ type: "brand.created", message: `Created brand ${created.name}`, entityType: "brand", entityId: created.id, brandId: created.id });
  return created;
}

export async function updateBrand(id: string, raw: BrandInput) {
  const input = brandInputSchema.parse(raw);
  const { product, ...brand } = input;
  const existing = await db.product.findFirst({ where: { brandId: id }, orderBy: { createdAt: "asc" } });
  const updated = await db.$transaction(async (tx) => {
    const b = await tx.brand.update({ where: { id }, data: brand });
    if (existing) await tx.product.update({ where: { id: existing.id }, data: product });
    else await tx.product.create({ data: { ...product, brandId: id } });
    return b;
  });
  await logActivity({ type: "brand.updated", message: `Updated brand ${updated.name}`, entityType: "brand", entityId: id, brandId: id });
  return updated;
}

export async function setBrandArchived(id: string, archived: boolean) {
  const b = await db.brand.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  await logActivity({ type: archived ? "brand.archived" : "brand.restored", message: `${archived ? "Archived" : "Restored"} brand ${b.name}`, entityType: "brand", entityId: id, brandId: id });
  return b;
}

/** Permanent deletion requires the exact brand name as confirmation. */
export async function deleteBrand(id: string, confirmName: string) {
  const b = await db.brand.findUnique({ where: { id } });
  if (!b) throw new Error("Brand not found");
  if (confirmName.trim() !== b.name) throw new Error("Confirmation text does not match the brand name");
  await db.brand.delete({ where: { id } });
  await logActivity({ type: "brand.deleted", message: `Permanently deleted brand ${b.name}`, entityType: "brand", entityId: id });
}

export async function addResearch(raw: ResearchInput) {
  const input = researchInputSchema.parse(raw);
  const flags = detectPromptInjection(`${input.title}\n${input.content}`) ? ["possible_prompt_injection"] : [];
  const item = await db.researchSource.create({ data: { ...input, flags: JSON.stringify(flags) } });
  await logActivity({ type: "research.added", message: `Added research “${item.title}”`, entityType: "research", entityId: item.id, brandId: input.brandId });
  return item;
}

export async function updateResearch(id: string, raw: ResearchInput) {
  const input = researchInputSchema.parse(raw);
  const flags = detectPromptInjection(`${input.title}\n${input.content}`) ? ["possible_prompt_injection"] : [];
  return db.researchSource.update({ where: { id }, data: { ...input, flags: JSON.stringify(flags) } });
}

export async function setResearchStatus(id: string, status: "verified" | "hypothesis" | "unreviewed") {
  return db.researchSource.update({ where: { id }, data: { status } });
}

export async function deleteResearch(id: string) {
  const item = await db.researchSource.delete({ where: { id } });
  await logActivity({ type: "research.deleted", message: `Deleted research “${item.title}”`, entityType: "research", entityId: id, brandId: item.brandId });
}
