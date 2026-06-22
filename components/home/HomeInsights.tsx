"use client";

import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";

const POST_KEYS = [
  { img: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=400", date: "27/06/2024", titleKey: "homeInsights.post1" },
  { img: "https://images.unsplash.com/photo-1521737706017-d3550090f772?auto=format&fit=crop&q=80&w=400", date: "04/10/2023", titleKey: "homeInsights.post2" },
  { img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=400", date: "04/10/2023", titleKey: "homeInsights.post3" },
  { img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400", date: "04/10/2023", titleKey: "homeInsights.post4" },
] as const;

export default function HomeInsights() {
  const { t } = useTranslation();

  return (
    <section className="bg-muted py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">{t("homeInsights.title")}</h2>
          <div className="mx-auto h-1 w-12 bg-primary" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {POST_KEYS.map((post) => (
            <article
              key={post.titleKey}
              className="flex h-full cursor-pointer flex-col overflow-hidden rounded bg-card text-card-foreground shadow-sm transition hover:shadow-md"
            >
              <Image
                src={post.img}
                alt={t(post.titleKey)}
                width={400}
                height={192}
                className="h-48 w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-6">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{post.date}</p>
                <h3 className="mb-4 text-sm font-bold leading-tight transition hover:text-primary">
                  {t(post.titleKey)}
                </h3>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <button
            type="button"
            className="rounded bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:opacity-90"
          >
            {t("homeInsights.viewBlog")}
          </button>
        </div>
      </div>
    </section>
  );
}
