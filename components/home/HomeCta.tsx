"use client";

import { useTranslation } from "@/hooks/useTranslation";
import PostJobButton from "./PostJobButton";

export default function HomeCta() {
  const { t } = useTranslation();

  return (
    <section className="bg-[#1a202c] py-12 text-center text-white">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-6 text-2xl font-bold">{t("homeCta.heading")}</h2>
        <PostJobButton
          className="rounded bg-primary px-10 py-4 font-bold text-primary-foreground transition hover:opacity-90"
          ariaLabel={t("auth.postJobNowAria")}
        >
          {t("homeCta.button")}
        </PostJobButton>
      </div>
    </section>
  );
}
