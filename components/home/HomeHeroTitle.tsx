"use client";

import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";

const HERO_LINE_1 = [{ text: "Tìm" }, { text: "&" }, { text: "Thuê" }];

const HERO_LINE_2 = [
  { text: "Freelancer", className: "text-amber-300" },
  { text: "Tại" },
  { text: "Vĩnh Long", className: "text-amber-300" },
];

const titleTextClass = "text-5xl leading-tight text-white";

export default function HomeHeroTitle() {
  return (
    <h1 className="mb-4">
      <TypewriterEffectSmooth
        words={HERO_LINE_1}
        textClassName={titleTextClass}
        cursorClassName="bg-amber-300"
        duration={1.4}
        delay={0.2}
        className="mb-1"
      />
      <TypewriterEffectSmooth
        words={HERO_LINE_2}
        textClassName={titleTextClass}
        cursorClassName="bg-amber-300"
        duration={1.8}
        delay={1.6}
      />
    </h1>
  );
}
