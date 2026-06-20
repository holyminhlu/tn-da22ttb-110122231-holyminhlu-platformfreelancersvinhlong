import type { Locale } from "@/lib/i18n/types";

export function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "vi-VN";
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

export function formatVndLocale(
  amount: string | number | null | undefined,
  locale: Locale,
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateLocale(
  value: string | null | undefined,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(getIntlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

export function formatDateTimeLocale(
  value: string | Date | null | undefined,
  locale: Locale,
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(getIntlLocale(locale));
}

export function formatCompactVndLocale(
  amount: string | number | null | undefined,
  locale: Locale,
): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (locale === "en") {
    if (n >= 1_000_000_000) {
      return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B VND`;
    }
    if (n >= 1_000_000) {
      return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M VND`;
    }
    if (n >= 1000) {
      return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K VND`;
    }
    return formatVndLocale(n, locale);
  }
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return formatVndLocale(n, locale);
}
