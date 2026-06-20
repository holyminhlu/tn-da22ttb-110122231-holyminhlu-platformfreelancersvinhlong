"use client";

import { useTranslation } from "@/hooks/useTranslation";

const titleTextClass = "text-5xl leading-tight font-bold text-white";

export default function HomeHeroTitle() {
  const { t } = useTranslation();

  return (
    <h1 className="mb-4 flex flex-col items-center">
      <span className={titleTextClass}>
        {t("hero.line1Prefix")}
        <span className="text-amber-300">{t("hero.line1Highlight")}</span>
      </span>
      <span className={titleTextClass}>
        {t("hero.line2Prefix")}
        <span className="text-amber-300">{t("hero.line2Highlight")}</span>
      </span>
    </h1>
  );
}
