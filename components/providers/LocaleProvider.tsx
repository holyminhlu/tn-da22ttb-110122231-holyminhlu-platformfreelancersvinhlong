"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  formatCompactVndLocale,
  formatDateLocale,
  formatDateTimeLocale,
  formatNumber,
  formatVndLocale,
} from "@/lib/i18n/format";
import { syncRuntimeLocale } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translate";
import type { Locale, TranslationParams } from "@/lib/i18n/types";
import {
  getLocalePreference,
  LOCALE_CHANGE_EVENT,
  setLocalePreference,
  type LocalePreference,
} from "@/lib/userPreferences";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: LocalePreference) => void;
  t: (keyOrVi: string, params?: TranslationParams) => string;
  formatVnd: (amount: string | number | null | undefined) => string;
  formatDate: (value: string | null | undefined) => string;
  formatDateTime: (value: string | Date | null | undefined) => string;
  formatCompactVnd: (amount: string | number | null | undefined) => string | null;
  formatNum: (value: number) => string;
  ready: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(getLocalePreference());
    syncRuntimeLocale(getLocalePreference());
    setReady(true);

    const onLocaleChange = (event: Event) => {
      const detail = (event as CustomEvent<LocalePreference>).detail;
      if (detail === "vi" || detail === "en") {
        setLocaleState(detail);
        syncRuntimeLocale(detail);
      }
    };

    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  const setLocale = useCallback((next: LocalePreference) => {
    setLocalePreference(next);
    setLocaleState(next);
    syncRuntimeLocale(next);
  }, []);

  const t = useCallback(
    (keyOrVi: string, params?: TranslationParams) => translate(locale, keyOrVi, params),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatVnd: (amount) => formatVndLocale(amount, locale),
      formatDate: (value) => formatDateLocale(value, locale),
      formatDateTime: (value) => formatDateTimeLocale(value, locale),
      formatCompactVnd: (amount) => formatCompactVndLocale(amount, locale),
      formatNum: (value) => formatNumber(value, locale),
      ready,
    }),
    [locale, setLocale, t, ready],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within LocaleProvider");
  }
  return ctx;
}

/** Safe hook for server components' client children — returns vi defaults if provider missing. */
export function useTranslationSafe() {
  const ctx = useContext(LocaleContext);
  const locale: Locale = ctx?.locale ?? "vi";
  return {
    locale,
    t: (keyOrVi: string, params?: TranslationParams) => translate(locale, keyOrVi, params),
    formatVnd: (amount: string | number | null | undefined) => formatVndLocale(amount, locale),
    formatDate: (value: string | null | undefined) => formatDateLocale(value, locale),
    formatDateTime: (value: string | Date | null | undefined) =>
      formatDateTimeLocale(value, locale),
    formatCompactVnd: (amount: string | number | null | undefined) =>
      formatCompactVndLocale(amount, locale),
    formatNum: (value: number) => formatNumber(value, locale),
    ready: ctx?.ready ?? false,
    setLocale: ctx?.setLocale,
  };
}
