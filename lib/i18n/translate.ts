import type { Locale, TranslationParams } from "@/lib/i18n/types";
import { enDictionary } from "@/lib/i18n/messages/en-dictionary";
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

export function translate(
  locale: Locale,
  keyOrVi: string,
  params?: TranslationParams,
): string {
  const keyed = getNested(keyedMessages[locale], keyOrVi) ?? getNested(keyedMessages.vi, keyOrVi);
  if (keyed) return interpolate(keyed, params);

  if (locale === "vi") return interpolate(keyOrVi, params);

  const fromDict = enDictionary[keyOrVi];
  if (fromDict) return interpolate(fromDict, params);

  return interpolate(keyOrVi, params);
}
