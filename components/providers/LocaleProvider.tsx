"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  formatCompactVndLocale,
  formatDateLocale,
  formatDateTimeLocale,
  formatNumber,
  formatVndLocale,
} from "@/lib/i18n/format";
import { translate } from "@/lib/i18n/translate";
import type { TranslationParams } from "@/lib/i18n/types";

type LocaleContextValue = {
  t: (keyOrVi: string, params?: TranslationParams) => string;
  formatVnd: (amount: string | number | null | undefined) => string;
  formatDate: (value: string | null | undefined) => string;
  formatDateTime: (value: string | Date | null | undefined) => string;
  formatCompactVnd: (amount: string | number | null | undefined) => string | null;
  formatNum: (value: number) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const t = useCallback(
    (keyOrVi: string, params?: TranslationParams) => translate(keyOrVi, params),
    [],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      t,
      formatVnd: formatVndLocale,
      formatDate: formatDateLocale,
      formatDateTime: formatDateTimeLocale,
      formatCompactVnd: formatCompactVndLocale,
      formatNum: formatNumber,
    }),
    [t],
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
