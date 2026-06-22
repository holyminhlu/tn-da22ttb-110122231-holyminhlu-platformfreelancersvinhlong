"use client";

import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import { WhyIcon } from "./icons";

export default function HomeWhyChoose() {
  const { t } = useTranslation();

  const left = [
    { title: t("homeWhy.trustTitle"), icon: "id" as const, desc: t("homeWhy.trustDesc") },
    { title: t("homeWhy.payTitle"), icon: "shield" as const, desc: t("homeWhy.payDesc") },
    { title: t("homeWhy.supportTitle"), icon: "headset" as const, desc: t("homeWhy.supportDesc") },
  ];

  const right = [
    { title: t("homeWhy.flexTitle"), icon: "clock" as const, desc: t("homeWhy.flexDesc") },
    { title: t("homeWhy.costTitle"), icon: "dollar" as const, desc: t("homeWhy.costDesc") },
  ];

  return (
    <section className="relative overflow-hidden bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-4xl font-bold">{t("homePage.whyTitle")}</h2>
          <div className="mx-auto h-1 w-12 bg-primary" />
        </div>
        <div className="relative flex flex-col items-center justify-between gap-8 lg:flex-row">
          <div className="flex-1 space-y-16 lg:text-right">
            {left.map((item) => (
              <div key={item.title} className="group">
                <div className="mb-3 flex items-center space-x-4 lg:justify-end">
                  <h3 className="text-xl font-bold transition group-hover:text-primary">{item.title}</h3>
                  <WhyIcon
                    name={item.icon}
                    className="text-2xl text-muted-foreground transition group-hover:text-primary"
                  />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground lg:ml-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-1 justify-center py-8">
            <div className="relative h-[400px] w-[400px]">
              <div className="absolute inset-0 scale-110 rounded-full bg-muted opacity-50" />
              <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-[12px] border-background shadow-2xl">
                <Image
                  src="/Media/anhVinhLong2.jpg"
                  alt={t("homePage.whyImageAlt")}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>
              <div className="pointer-events-none absolute -bottom-10 left-1/2 z-20 h-20 w-full max-w-md -translate-x-1/2 bg-gradient-to-t from-background to-transparent" />
            </div>
          </div>

          <div className="flex-1 space-y-16 lg:text-left">
            {right.map((item) => (
              <div key={item.title} className="group">
                <div className="mb-3 flex items-center space-x-4 lg:justify-start">
                  <WhyIcon
                    name={item.icon}
                    className="text-2xl text-muted-foreground transition group-hover:text-primary"
                  />
                  <h3 className="text-xl font-bold transition group-hover:text-primary">{item.title}</h3>
                </div>
                <p className="max-w-xs text-sm text-muted-foreground lg:mr-auto">{item.desc}</p>
              </div>
            ))}
            <div className="pt-4">
              <button
                type="button"
                className="rounded bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:opacity-90"
              >
                {t("homePage.whyCta")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
