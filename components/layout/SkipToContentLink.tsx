"use client";

import { useTranslation } from "@/hooks/useTranslation";

export default function SkipToContentLink() {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
    >
      {t("layout.skipToContent")}
    </a>
  );
}
