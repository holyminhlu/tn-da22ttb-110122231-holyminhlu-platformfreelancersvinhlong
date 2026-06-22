"use client";

import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";

const REGION_KEYS = [
  { titleKey: "homeWork.regionTraVinh", src: "/Media/trvinh.jpg" },
  { titleKey: "homeWork.regionVinhLong", src: "/Media/vinhlonga.jpg", featured: true },
  { titleKey: "homeWork.regionBenTre", src: "/Media/bentre.png" },
] as const;

function RegionPanel({
  title,
  src,
  featured = false,
}: {
  title: string;
  src: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-xl bg-[#1D1F2F] text-center text-white shadow-lg ring-1 ring-black/10 transition-transform duration-300 ${
        featured ? "md:scale-105 md:shadow-2xl md:ring-blue-500/30" : "md:scale-[0.97]"
      }`}
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[3/4]">
        <Image
          src={src}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/35" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <h3 className="text-2xl font-semibold md:text-3xl">{title}</h3>
      </div>
    </article>
  );
}

export default function HomeWorkYourWay() {
  const { t } = useTranslation();

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">{t("homeWork.title")}</h2>
          <div className="mx-auto h-1 w-12 bg-primary" />
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-8">
          {REGION_KEYS.map((panel) => (
            <RegionPanel
              key={panel.titleKey}
              title={t(panel.titleKey)}
              src={panel.src}
              featured={"featured" in panel ? panel.featured : false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
