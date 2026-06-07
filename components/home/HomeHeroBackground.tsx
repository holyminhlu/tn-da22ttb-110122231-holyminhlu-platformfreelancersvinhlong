"use client";

import { Boxes } from "@/components/ui/background-boxes";

export default function HomeHeroBackground() {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden bg-[#0f172a]">
        <Boxes />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[#0f172a] [mask-image:radial-gradient(transparent,white)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#1c2e4a]/70 via-[#111b2d]/40 to-[#0f172a]/80" />
    </>
  );
}
