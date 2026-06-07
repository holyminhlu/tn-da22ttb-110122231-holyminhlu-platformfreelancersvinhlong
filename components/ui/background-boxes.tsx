"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const HOVER_COLORS = [
  "rgb(253 224 71)",   // yellow-300
  "rgb(125 211 252)",  // sky-300
  "rgb(249 168 212)",  // pink-300
  "rgb(134 239 172)",  // green-300
  "rgb(103 232 249)",  // cyan-300
  "rgb(196 181 253)",  // violet-300
  "rgb(253 186 116)",  // orange-300
  "rgb(240 171 252)",  // fuchsia-300
  "rgb(190 242 100)",  // lime-300
  "rgb(253 164 175)",  // rose-300
  "rgb(110 231 183)",  // emerald-300
  "rgb(252 211 77)",   // amber-300
];

type BoxesProps = {
  className?: string;
};

export const BoxesCore = ({ className }: BoxesProps) => {
  const rows = useMemo(() => new Array(80).fill(1), []);
  const cols = useMemo(() => new Array(48).fill(1), []);

  const getRandomColor = () => HOVER_COLORS[Math.floor(Math.random() * HOVER_COLORS.length)];

  return (
    <div
      style={{
        transform:
          "translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)",
      }}
      className={cn(
        "absolute -top-1/4 left-1/4 z-0 flex h-full w-full -translate-x-1/2 -translate-y-1/2 p-4",
        className,
      )}
    >
      {rows.map((_, i) => (
        <div key={`row-${i}`} className="relative h-10 w-20 border-l border-slate-500/90">
          {cols.map((_, j) => (
            <motion.div
              key={`col-${j}`}
              whileHover={{
                backgroundColor: getRandomColor(),
                transition: { duration: 0 },
              }}
              className="relative h-10 w-20 border-r border-t border-slate-500/90"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="pointer-events-none absolute -left-[28px] -top-[18px] h-7 w-12 stroke-[1px] text-slate-500/90"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
