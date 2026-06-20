import { translate } from "@/lib/i18n/translate";
import {
  formatCompactVndLocale,
  formatDateLocale,
  formatDateTimeLocale,
  formatNumber,
  formatVndLocale,
} from "@/lib/i18n/format";
import type { Locale, TranslationParams } from "@/lib/i18n/types";

let runtimeLocale: Locale = "vi";

export function syncRuntimeLocale(locale: Locale) {
  runtimeLocale = locale;
}

export function getRuntimeLocale(): Locale {
  return runtimeLocale;
}

/** Dịch UI ngoài hook — đọc locale hiện tại (đồng bộ từ LocaleProvider). */
export function tUi(keyOrVi: string, params?: TranslationParams): string {
  return translate(runtimeLocale, keyOrVi, params);
}

export function formatVndUi(amount: string | number | null | undefined): string {
  return formatVndLocale(amount, runtimeLocale);
}

export function formatDateUi(value: string | null | undefined): string {
  return formatDateLocale(value, runtimeLocale);
}

export function formatDateTimeUi(value: string | Date | null | undefined): string {
  return formatDateTimeLocale(value, runtimeLocale);
}

export function formatCompactVndUi(amount: string | number | null | undefined): string | null {
  return formatCompactVndLocale(amount, runtimeLocale);
}

export function formatNumUi(value: number): string {
  return formatNumber(value, runtimeLocale);
}
