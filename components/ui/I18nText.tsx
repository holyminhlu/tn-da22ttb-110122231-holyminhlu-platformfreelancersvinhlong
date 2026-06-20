"use client";

import { useTranslation } from "@/hooks/useTranslation";

/** Dùng trong Server Component khi cần chuỗi UI có dịch. */
export default function I18nText({ text }: { text: string }) {
  const { t } = useTranslation();
  return <>{t(text)}</>;
}
