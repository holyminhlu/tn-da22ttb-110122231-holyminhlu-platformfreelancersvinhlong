"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useRef } from "react";

const TITLE_LINE_1 = "Vĩnh Long";
const TITLE_LINE_2 = "Connect";
const LOGO_SRC = "/Logo/logoVLC.png";
const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

const FORM_DURATION = 3000;
const HOLD_DURATION = 2000;
const LOGO_DURATION = 5000;
const DISSOLVE_DURATION = 2000;
const LOGO_PHASE_START = FORM_DURATION + HOLD_DURATION;
const DISSOLVE_PHASE_START = LOGO_PHASE_START + LOGO_DURATION;
const TOTAL_LOOP = DISSOLVE_PHASE_START + DISSOLVE_DURATION;

const BG_COLOR = "#eef6ff";
const TRAIL_FILL = "rgba(186, 210, 240, 0.32)";
const FADE_MS = 350;

const PARTICLE_COLORS = [
  "#0066cc",
  "#1c2e4a",
  "#0891b2",
  "#16a34a",
  "#2563eb",
  "#0e7490",
  "#1d4ed8",
];

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type AuthParticleStormProps = {
  className?: string;
};

type Phase = "form" | "hold" | "logo" | "dissolve";

type PhaseState = {
  showParticles: boolean;
  titleOpacity: number;
  logoOpacity: number;
};

function getPhase(cycleTime: number): Phase {
  if (cycleTime < FORM_DURATION) return "form";
  if (cycleTime < LOGO_PHASE_START) return "hold";
  if (cycleTime < DISSOLVE_PHASE_START) return "logo";
  return "dissolve";
}

function fadeInOut(localTime: number, duration: number, fadeMs = FADE_MS) {
  const t = tUi;
  if (localTime < fadeMs) return localTime / fadeMs;
  if (localTime > duration - fadeMs) return (duration - localTime) / fadeMs;
  return 1;
}

class Particle {
  destX: number;
  destY: number;
  char: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  formStartX: number;
  formStartY: number;
  scatterX = 0;
  scatterY = 0;
  lastPhase: Phase | null = null;

  constructor(destX: number, destY: number, width: number, height: number, fontSize: number) {
    this.destX = destX;
    this.destY = destY;
    this.fontSize = fontSize;
    this.char = CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.color =
      PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)] ?? "#0066cc";
    this.formStartX = this.x;
    this.formStartY = this.y;
    this.scatterX = this.x;
    this.scatterY = this.y;
  }

  pickScatterTarget(width: number, height: number) {
    this.scatterX = Math.random() * width;
    this.scatterY = Math.random() * height;
    this.char = CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }

  onPhaseEnter(phase: Phase, width: number, height: number) {
    if (phase === "form" && this.lastPhase === "dissolve") {
      this.formStartX = this.scatterX;
      this.formStartY = this.scatterY;
      this.x = this.formStartX;
      this.y = this.formStartY;
    }

    if (phase === "hold") {
      this.x = this.destX;
      this.y = this.destY;
      this.pickScatterTarget(width, height);
    }

    if (phase === "logo" || phase === "dissolve") {
      this.x = this.destX;
      this.y = this.destY;
    }

    this.lastPhase = phase;
  }

  update(time: number, width: number, height: number) {
    const cycleTime = time % TOTAL_LOOP;
    const phase = getPhase(cycleTime);

    if (phase !== this.lastPhase) {
      this.onPhaseEnter(phase, width, height);
    }

    if (phase === "form") {
      const progress = easeInOutCubic(cycleTime / FORM_DURATION);
      this.x = this.formStartX + (this.destX - this.formStartX) * progress;
      this.y = this.formStartY + (this.destY - this.formStartY) * progress;
      return;
    }

    if (phase === "hold" || phase === "logo") {
      this.x = this.destX;
      this.y = this.destY;
      return;
    }

    const progress = easeInOutCubic((cycleTime - DISSOLVE_PHASE_START) / DISSOLVE_DURATION);
    this.x = this.destX + (this.scatterX - this.destX) * progress;
    this.y = this.destY + (this.scatterY - this.destY) * progress;
  }

  draw(ctx: CanvasRenderingContext2D, opacity: number) {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = this.color;
    ctx.font = `${this.fontSize}px monospace`;
    ctx.fillText(this.char, this.x, this.y);
    ctx.restore();
  }
}

function getParticleFontSize(width: number) {
  return Math.max(12, Math.min(18, Math.round(width / 48)));
}

function getTitleFontSize(width: number) {
  return Math.min(width * 0.12, 156);
}

function getPhaseState(time: number): PhaseState {
  const cycleTime = time % TOTAL_LOOP;

  if (cycleTime < FORM_DURATION) {
    const progress = cycleTime / FORM_DURATION;
    return {
      showParticles: Math.max(0, 1 - (progress - 0.75) / 0.2) > 0.02,
      titleOpacity: Math.min(1, Math.max(0, (progress - 0.7) / 0.3)),
      logoOpacity: 0,
    };
  }

  if (cycleTime < LOGO_PHASE_START) {
    return {
      showParticles: false,
      titleOpacity: 1,
      logoOpacity: 0,
    };
  }

  if (cycleTime < DISSOLVE_PHASE_START) {
    const localTime = cycleTime - LOGO_PHASE_START;
    const titleOpacity = localTime < FADE_MS ? Math.max(0, 1 - localTime / FADE_MS) : 0;

    return {
      showParticles: false,
      titleOpacity,
      logoOpacity: fadeInOut(localTime, LOGO_DURATION),
    };
  }

  return {
    showParticles: true,
    titleOpacity: 0,
    logoOpacity: 0,
  };
}

function getParticleOpacity(time: number): number {
  const cycleTime = time % TOTAL_LOOP;

  if (cycleTime < FORM_DURATION) {
    const progress = cycleTime / FORM_DURATION;
    return Math.max(0, 1 - (progress - 0.75) / 0.2);
  }

  if (cycleTime < DISSOLVE_PHASE_START) {
    return 0;
  }

  const dissolveProgress = (cycleTime - DISSOLVE_PHASE_START) / DISSOLVE_DURATION;
  return Math.min(1, dissolveProgress / 0.25 + 0.15);
}

async function ensureTitleFont(fontSize: number) {
  const t = tUi;
  if (typeof document === "undefined") return;
  const spec = `700 ${fontSize}px "Be Vietnam Pro"`;
  try {
    await document.fonts.load(spec);
  } catch {
    // Fallback to system sans-serif if custom font is unavailable.
  }
}

function loadLogoImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load logo"));
    image.src = LOGO_SRC;
  });
}

function drawTitleText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fontSize: number,
  opacity: number,
) {
  const t = tUi;
  if (opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `700 ${fontSize}px "Be Vietnam Pro", sans-serif`;
  ctx.fillStyle = "#0066cc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = fontSize * 1.12;
  const centerY = height / 2;

  ctx.fillText(TITLE_LINE_1, width / 2, centerY - lineHeight * 0.52);
  ctx.fillText(TITLE_LINE_2, width / 2, centerY + lineHeight * 0.52);
  ctx.restore();
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  width: number,
  height: number,
  opacity: number,
) {
  if (opacity <= 0 || !logo.complete || logo.naturalWidth === 0) return;

  const maxWidth = width * 0.72;
  const maxHeight = height * 0.56;
  const aspect = logo.naturalWidth / logo.naturalHeight;

  let drawWidth = maxWidth;
  let drawHeight = drawWidth / aspect;

  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight * aspect;
  }

  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(logo, x, y, drawWidth, drawHeight);
  ctx.restore();
}

function createTextParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): Particle[] {
  const particles: Particle[] = [];
  const particleFontSize = getParticleFontSize(width);
  const fontSize = getTitleFontSize(width);

  ctx.clearRect(0, 0, width, height);
  drawTitleText(ctx, width, height, fontSize, 1);

  const imageData = ctx.getImageData(0, 0, width, height).data;
  ctx.clearRect(0, 0, width, height);

  const step = 5;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = imageData[(y * width + x) * 4 + 3];
      if (alpha > 128) {
        particles.push(new Particle(x, y, width, height, particleFontSize));
      }
    }
  }

  return particles;
}

export default function AuthParticleStorm({ className }: AuthParticleStormProps) {
  const { t } = useTranslation();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let titleFontSize = 0;
    let particles: Particle[] = [];
    let logoImage: HTMLImageElement | null = null;
    let frameId = 0;
    let resizeRetryId = 0;
    let disposed = false;

    const initCanvas = async () => {
      if (disposed) return;

      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      if (width <= 1 || height <= 1) {
        resizeRetryId = window.requestAnimationFrame(() => {
          void initCanvas();
        });
        return;
      }

      canvas.width = width;
      canvas.height = height;
      titleFontSize = getTitleFontSize(width);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      if (!logoImage) {
        try {
          logoImage = await loadLogoImage();
        } catch {
          logoImage = null;
        }
      }

      await ensureTitleFont(titleFontSize);
      particles = createTextParticles(ctx, width, height);
    };

    const animate = (timestamp: number) => {
      if (disposed || width <= 1 || height <= 1) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      const phase = getPhaseState(timestamp);
      const particleOpacity = getParticleOpacity(timestamp);

      ctx.fillStyle = TRAIL_FILL;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(timestamp, width, height);
        if (phase.showParticles) {
          particles[i].draw(ctx, particleOpacity);
        }
      }

      drawTitleText(ctx, width, height, titleFontSize, phase.titleOpacity);

      if (logoImage && phase.logoOpacity > 0) {
        drawLogo(ctx, logoImage, width, height, phase.logoOpacity);
      }

      frameId = requestAnimationFrame(animate);
    };

    void initCanvas();
    frameId = requestAnimationFrame(animate);

    const observer = new ResizeObserver(() => {
      void initCanvas();
    });
    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(resizeRetryId);
    };
  }, []);

  return (
    <div ref={containerRef} className={className} aria-hidden>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
