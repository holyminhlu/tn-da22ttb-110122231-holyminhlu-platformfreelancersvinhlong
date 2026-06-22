"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getTopLocations, getTopSkills } from "@/lib/api/freelancers";

export default function HomeBrowseLists() {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<{ name: string; freelancerCount: number }[]>([]);
  const [locations, setLocations] = useState<{ name: string; freelancerCount: number }[]>([]);

  useEffect(() => {
    let mounted = true;
    void Promise.all([getTopSkills(48), getTopLocations(16)])
      .then(([skillsData, locationsData]) => {
        if (!mounted) return;
        setSkills(skillsData.skills ?? []);
        setLocations(locationsData.locations ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setSkills([]);
        setLocations([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="border-b border-border bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">{t("homePage.browseTitle")}</h2>
          <div className="mx-auto h-1 w-12 bg-primary" />
        </div>

        <div className="mb-20">
          <h3 className="mb-10 text-center font-bold">{t("homePage.topSkills")}</h3>
          {skills.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs text-muted-foreground md:grid-cols-4">
              {skills.map((skill) => (
                <Link
                  key={skill.name}
                  href={`/freelancers?skill=${encodeURIComponent(skill.name)}`}
                  className="transition hover:text-primary"
                  title={t("homePage.freelancerCount", { count: skill.freelancerCount })}
                >
                  {skill.name}
                  <span className="ml-1 text-muted-foreground/70">({skill.freelancerCount})</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t("homePage.noSkills")}</p>
          )}
          <div className="mt-12 text-center">
            <Link
              href="/freelancers"
              className="inline-block rounded border border-primary px-8 py-2 text-sm font-bold text-primary transition hover:bg-accent"
            >
              {t("homePage.viewAllSkills")}
            </Link>
          </div>
        </div>

        <div>
          <h3 className="mb-10 text-center font-bold">{t("homePage.topLocations")}</h3>
          {locations.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs text-muted-foreground md:grid-cols-4">
              {locations.map((loc) => (
                <Link
                  key={loc.name}
                  href={`/freelancers?location=${encodeURIComponent(loc.name)}`}
                  className="transition hover:text-primary"
                  title={t("homePage.freelancerCount", { count: loc.freelancerCount })}
                >
                  {loc.name}
                  <span className="ml-1 text-muted-foreground/70">({loc.freelancerCount})</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t("homePage.noLocations")}</p>
          )}
          <div className="mt-12 text-center">
            <Link
              href="/freelancers"
              className="inline-block rounded border border-primary px-8 py-2 text-sm font-bold text-primary transition hover:bg-accent"
            >
              {t("homePage.viewAllLocations")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
