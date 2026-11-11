import { z } from "zod";

const stringArray = z.array(z.string());

/** Parse a JSON string column, falling back when the stored value is malformed. */
export function parseJson<T>(raw: string | null | undefined, schema: z.ZodType<T>, fallback: T): T {
  if (!raw) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function parseStringArray(raw: string | null | undefined): string[] {
  return parseJson(raw, stringArray, []);
}

/** Split a multi-line/bulleted field into clean list items. */
export function splitList(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|;/)
    .map((line) => line.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export function wordCount(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}
