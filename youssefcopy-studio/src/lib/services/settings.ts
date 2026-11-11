import { db } from "../db";
import { aiStatusFrom, readAiConfig, type AiStatus } from "../ai/config";

export async function logActivity(input: { type: string; message: string; entityType?: string; entityId?: string; brandId?: string | null }) {
  await db.activityLog.create({
    data: {
      type: input.type,
      message: input.message.slice(0, 500),
      entityType: input.entityType ?? "",
      entityId: input.entityId ?? "",
      brandId: input.brandId ?? null,
    },
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function isAiEnabledByUser(): Promise<boolean> {
  return (await getSetting("aiEnabled")) !== "false";
}

export async function getAiStatus(): Promise<AiStatus> {
  return aiStatusFrom(readAiConfig(), await isAiEnabledByUser());
}
