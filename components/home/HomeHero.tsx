"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { HERO_SKILL_TAGS } from "./data";
import HeroSearchBar from "./HeroSearchBar";
import HomeHeroBackground from "./HomeHeroBackground";
import HomeHeroTitle from "./HomeHeroTitle";

export default function HomeHero() {
  const { t } = useTranslation();

  const skillTags = [
    t("homePage.skillDesign"),
    t("homePage.skillWebDev"),
    t("homePage.skillWriting"),
    t("homePage.skillSoftware"),
    t("homePage.skillGraphic"),
  ] as const;

  return (
    <section className="hero-section relative overflow-hidden pb-24 pt-16 text-white">
      <HomeHeroBackground />

      <div className="relative z-20 mx-auto flex min-h-[calc(92vh-8rem)] max-w-4xl flex-col items-center justify-center px-6 text-center">
        <HomeHeroTitle />
        <p className="mb-10 max-w-2xl text-xl text-neutral-300">{t("homePage.heroSubtitle")}</p>

        <HeroSearchBar />

        <div className="flex flex-wrap justify-center gap-2 text-xs font-medium">
          {skillTags.map((tag, idx) => (
            <Link
              key={HERO_SKILL_TAGS[idx]}
              href={`/freelancers?q=${encodeURIComponent(HERO_SKILL_TAGS[idx])}`}
              className="skill-tag rounded-sm px-3 py-1"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
