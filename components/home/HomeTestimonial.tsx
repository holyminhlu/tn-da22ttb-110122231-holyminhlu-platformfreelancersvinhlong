"use client";

import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";
import { FaChevronLeft, FaChevronRight } from "./icons";

export default function HomeTestimonial() {
  const { t } = useTranslation();

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-bold">{t("homeTestimonial.title")}</h2>
        <div className="mx-auto mb-16 h-1 w-12 bg-primary" />
        <div className="relative px-12">
          <p className="mb-12 text-lg italic leading-relaxed text-muted-foreground">
            {t("homeTestimonial.quote")}
          </p>
          <div className="flex flex-col items-center">
            <Image
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100"
              alt={t("homeTestimonial.authorName")}
              width={64}
              height={64}
              className="mb-4 rounded-full object-cover"
            />
            <h4 className="font-bold">{t("homeTestimonial.authorName")}</h4>
            <p className="text-sm text-muted-foreground">{t("homeTestimonial.authorRole")}</p>
          </div>
          <button
            type="button"
            className="absolute -left-4 top-1/2 text-3xl text-muted-foreground/50 hover:text-primary"
            aria-label={t("homeTestimonial.prevAria")}
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className="absolute -right-4 top-1/2 text-3xl text-muted-foreground/50 hover:text-primary"
            aria-label={t("homeTestimonial.nextAria")}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
