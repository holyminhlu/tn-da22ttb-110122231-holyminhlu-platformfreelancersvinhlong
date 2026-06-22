"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getTopSkills } from "@/lib/api/freelancers";
import { CategoryIcon } from "./icons";
import { getSkillIconKey } from "./skillIcon";
import type { CategoryIconKey } from "./types";

function CategoryCard({
  icon,
  title,
  count,
  href,
  countLabel,
}: {
  icon: CategoryIconKey;
  title: string;
  count: number;
  href: string;
  countLabel: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center rounded border border-border bg-card p-8 text-center text-card-foreground transition hover:shadow-lg"
    >
      <CategoryIcon name={icon} className="mb-4 text-4xl text-primary" />
      <h3 className="mb-1 font-bold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{countLabel}</p>
    </Link>
  );
}

export default function HomeCategories() {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<{ name: string; freelancerCount: number }[]>([]);

  useEffect(() => {
    let mounted = true;
    void getTopSkills(9)
      .then((data) => {
        if (mounted) setSkills(data.skills ?? []);
      })
      .catch(() => {
        if (mounted) setSkills([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="categories" className="bg-muted py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-bold">{t("homeCategories.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("homeCategories.subtitle")}</p>
          <div className="mx-auto mt-4 h-1 w-12 bg-primary" />
        </div>

        {skills.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((item, index) => (
              <CategoryCard
                key={item.name}
                icon={getSkillIconKey(item.name, index)}
                title={item.name}
                count={item.freelancerCount}
                countLabel={t("homeCategories.freelancerLabel", { count: item.freelancerCount })}
                href={`/freelancers?skill=${encodeURIComponent(item.name)}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">{t("homeCategories.empty")}</p>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/freelancers"
            className="inline-block rounded bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:opacity-90"
          >
            {t("homeCategories.viewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
