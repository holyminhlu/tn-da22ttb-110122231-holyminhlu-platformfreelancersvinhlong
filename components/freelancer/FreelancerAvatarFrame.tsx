"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { AVATAR_FRAME_DRAWERS } from "@/lib/freelancer/avatarFrameDraw";
import { getAvatarFrameSizes, getAvatarTierId } from "@/lib/freelancer/avatarTier";
import { cn } from "@/lib/utils";
import "./freelancer-avatar-frame.css";

export type FreelancerAvatarFrameProps = {
  completedJobs?: number | null;
  size?: number;
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
  children?: ReactNode;
  className?: string;
  innerClassName?: string;
  imgClassName?: string;
  shape?: "circle" | "rounded-sm";
  title?: string;
};

export default function FreelancerAvatarFrame({
  completedJobs = 0,
  size = 48,
  src,
  alt = "",
  fallback,
  children,
  className,
  innerClassName,
  imgClassName,
  shape = "circle",
  title,
}: FreelancerAvatarFrameProps) {
  const { t } = useTranslation();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visibleRef = useRef(true);
  const tierId = getAvatarTierId(completedJobs);
  const { canvasSize, tier } = getAvatarFrameSizes(completedJobs, size);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry?.isIntersecting ?? true;
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = Math.round(canvasSize * dpr);
    canvas.height = Math.round(canvasSize * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = AVATAR_FRAME_DRAWERS[tierId];
    let frame = 0;
    let raf = 0;

    const loop = () => {
      if (visibleRef.current) {
        frame += 1;
        draw(ctx, frame, canvasSize);
      }
      raf = window.requestAnimationFrame(loop);
    };

    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [canvasSize, tierId]);

  const inner = children ?? (
    src ? (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn("fl-avatar-frame__img", imgClassName)}
        referrerPolicy="no-referrer"
        unoptimized
      />
    ) : (
      <span className={cn("fl-avatar-frame__fallback", imgClassName)}>{fallback}</span>
    )
  );

  return (
    <div
      ref={wrapRef}
      className={cn("fl-avatar-frame", className)}
      style={{ width: canvasSize, height: canvasSize }}
      title={title ?? `Cấp bậc: ${tier.label}`}
    >
      <canvas
        ref={canvasRef}
        className="fl-avatar-frame__canvas"
        aria-hidden
        width={canvasSize}
        height={canvasSize}
      />
      <div
        className={cn(
          "fl-avatar-frame__inner",
          shape === "rounded-sm" && "fl-avatar-frame__inner--rounded-sm",
          innerClassName,
        )}
        style={{ width: size, height: size }}
      >
        {inner}
      </div>
    </div>
  );
}
