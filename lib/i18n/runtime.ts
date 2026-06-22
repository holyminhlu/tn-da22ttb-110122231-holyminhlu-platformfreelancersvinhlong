import { translate } from "@/lib/i18n/translate";
import {
  formatCompactVndLocale,
  formatDateLocale,
  formatDateTimeLocale,
  formatNumber,
  formatVndLocale,
} from "@/lib/i18n/format";
import type { TranslationParams } from "@/lib/i18n/types";

/** Dịch UI ngoài hook React. */
export function tUi(keyOrVi: string, params?: TranslationParams): string {
  return translate(keyOrVi, params);
}

export function formatVndUi(amount: string | number | null | undefined): string {
  return formatVndLocale(amount);
}

export function formatDateUi(value: string | null | undefined): string {
  return formatDateLocale(value);
}

export function formatDateTimeUi(value: string | Date | null | undefined): string {
  return formatDateTimeLocale(value);
}

export function formatCompactVndUi(amount: string | number | null | undefined): string | null {
  return formatCompactVndLocale(amount);
}

export function formatNumUi(value: number): string {
  return formatNumber(value);
}
