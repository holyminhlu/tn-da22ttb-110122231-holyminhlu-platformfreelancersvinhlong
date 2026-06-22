import type { TranslationParams } from "@/lib/i18n/types";
import { isStructuredTranslationKey } from "@/lib/i18n/config";
import { keyedMessages } from "@/lib/i18n/messages/keyed";

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    text,
  );
}

/** Tra cứu chuỗi UI tiếng Việt theo key có cấu trúc hoặc literal. */
export function translate(keyOrVi: string, params?: TranslationParams): string {
  const keyed = getNested(keyedMessages, keyOrVi);
  if (keyed) return interpolate(keyed, params);

  if (process.env.NODE_ENV === "development" && isStructuredTranslationKey(keyOrVi)) {
    console.warn(`[i18n] Missing translation key: "${keyOrVi}"`);
  }

  return interpolate(keyOrVi, params);
}
