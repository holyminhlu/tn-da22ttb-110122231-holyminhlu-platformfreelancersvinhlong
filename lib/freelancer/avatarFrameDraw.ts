import type { AvatarTierId } from "./avatarTier";

type DrawFn = (ctx: CanvasRenderingContext2D, t: number, W: number) => void;

const drawNewcomer: DrawFn = (ctx, t, W) => {
  const cx = W / 2;
  const cy = W / 2;
  const r = W / 2 - 8;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -t * 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 2.5;
  const pulseAlpha = 0.4 + 0.3 * Math.sin(t * 0.04);
  ctx.strokeStyle = `rgba(156,163,175,${pulseAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.015;
    const px = cx + Math.cos(a) * (r + 2);
    const py = cy + Math.sin(a) * (r + 2);
    ctx.fillStyle = `rgba(156,163,175,${0.5 + 0.5 * Math.sin(t * 0.07 + i)})`;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawStandard: DrawFn = (ctx, t, W) => {
  const cx = W / 2;
  const cy = W / 2;
  const r = W / 2 - 6;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  const steps = 64;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2 + t * 0.025;
    const a1 = ((i + 1) / steps) * Math.PI * 2 + t * 0.025;
    const hue = (i / steps) * 280 + 200;
    ctx.strokeStyle = `hsl(${hue},80%,65%)`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2 + t * 0.025;
    const a1 = ((i + 1) / steps) * Math.PI * 2 + t * 0.025;
    const hue = (i / steps) * 280 + 200;
    ctx.strokeStyle = `hsl(${hue},80%,65%)`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - t * 0.02;
    const px = cx + Math.cos(a) * (r + 10);
    const py = cy + Math.sin(a) * (r + 10);
    const hue = 200 + (i / 10) * 280;
    const alpha = 0.6 + 0.4 * Math.sin(t * 0.06 + i * 0.7);
    ctx.fillStyle = `hsla(${hue},80%,65%,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawProfessional: DrawFn = (ctx, t, W) => {
  const cx = W / 2;
  const cy = W / 2;
  const r = W / 2 - 6;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  const glowR = r + 8 + 4 * Math.sin(t * 0.04);
  const grd = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, glowR + 8);
  grd.addColorStop(0, "rgba(251,191,36,0)");
  grd.addColorStop(0.5, `rgba(251,191,36,${0.3 + 0.2 * Math.sin(t * 0.05)})`);
  grd.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR + 8, 0, Math.PI * 2);
  ctx.fill();
  const steps = 72;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2 + t * 0.018;
    const a1 = ((i + 1) / steps) * Math.PI * 2 + t * 0.018;
    const p = i / steps;
    const bright = p < 0.5 ? p * 2 : 2 - p * 2;
    ctx.strokeStyle = `hsl(${42 + bright * 16},95%,${48 + bright * 18}%)`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2 + t * 0.018;
    const a1 = ((i + 1) / steps) * Math.PI * 2 + t * 0.018;
    const p = i / steps;
    const bright = p < 0.5 ? p * 2 : 2 - p * 2;
    ctx.strokeStyle = `hsl(${42 + bright * 16},95%,${48 + bright * 18}%)`;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
  const steps2 = 72;
  for (let i = 0; i < steps2; i++) {
    const a0 = (i / steps2) * Math.PI * 2 - t * 0.022;
    const a1 = ((i + 1) / steps2) * Math.PI * 2 - t * 0.022;
    const p = i / steps2;
    const bright = p < 0.5 ? p * 2 : 2 - p * 2;
    ctx.strokeStyle = `hsla(${36 + bright * 20},90%,${55 + bright * 12}%,0.6)`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, a0, a1);
    ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + t * 0.012;
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.08 + i * 1.3));
    const dist = r + 14;
    const px = cx + Math.cos(a) * dist;
    const py = cy + Math.sin(a) * dist;
    ctx.fillStyle = `rgba(251,191,36,${twinkle})`;
    const s = 2.5 + twinkle * 1.5;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + t * 0.03);
    ctx.fillRect(-s / 2, -s / 6, s, s / 3);
    ctx.fillRect(-s / 6, -s / 2, s / 3, s);
    ctx.restore();
  }
  ctx.restore();
};

const drawExcellent: DrawFn = (ctx, t, W) => {
  const cx = W / 2;
  const cy = W / 2;
  const r = W / 2 - 8;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  const hue0 = (t * 0.5) % 360;
  const glowAlpha = 0.35 + 0.2 * Math.sin(t * 0.04);
  const grd = ctx.createRadialGradient(cx, cy, r - 6, cx, cy, r + 20);
  grd.addColorStop(0, `hsla(${hue0},80%,60%,0)`);
  grd.addColorStop(0.5, `hsla(${hue0},80%,60%,${glowAlpha})`);
  grd.addColorStop(1, `hsla(${hue0},80%,60%,0)`);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
  ctx.fill();
  const steps = 96;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2 + t * 0.03;
    const a1 = ((i + 1) / steps) * Math.PI * 2 + t * 0.03;
    const hue = (hue0 + (i / steps) * 360) % 360;
    ctx.strokeStyle = `hsl(${hue},90%,62%)`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2 + t * 0.03;
    const a1 = ((i + 1) / steps) * Math.PI * 2 + t * 0.03;
    const hue = (hue0 + (i / steps) * 360) % 360;
    ctx.strokeStyle = `hsl(${hue},90%,62%)`;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2 - t * 0.02;
    const a1 = ((i + 1) / steps) * Math.PI * 2 - t * 0.02;
    const hue = (hue0 + 180 + (i / steps) * 360) % 360;
    ctx.strokeStyle = `hsla(${hue},85%,65%,0.55)`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, a0, a1);
    ctx.stroke();
  }
  for (let i = 0; i < 20; i++) {
    const baseA = (i / 20) * Math.PI * 2;
    const a = baseA + t * 0.018;
    const twinkle = Math.abs(Math.sin(t * 0.09 + i * 0.95));
    const hue = (hue0 + (i / 20) * 360) % 360;
    const dist = r + 16 + 4 * Math.sin(t * 0.05 + i);
    const px = cx + Math.cos(a) * dist;
    const py = cy + Math.sin(a) * dist;
    if (i % 3 === 0) {
      ctx.fillStyle = `hsla(${hue},90%,65%,${0.5 + 0.5 * twinkle})`;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + t * 0.04);
      const s = 3 + twinkle * 2.5;
      ctx.fillRect(-s / 2, -s / 6, s, s / 3);
      ctx.fillRect(-s / 6, -s / 2, s / 3, s);
      ctx.restore();
    } else {
      ctx.fillStyle = `hsla(${hue},85%,68%,${0.4 + 0.6 * twinkle})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + twinkle * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const nParticles = 12;
  for (let i = 0; i < nParticles; i++) {
    const life = ((t * 0.6 + i * (1000 / nParticles)) % 1000) / 1000;
    const a = (i / nParticles) * Math.PI * 2 + t * 0.01;
    const dist = r + 2 + life * 24;
    const px = cx + Math.cos(a) * dist;
    const py = cy + Math.sin(a) * dist;
    const alpha = (1 - life) * 0.8;
    const hue = (hue0 + (i / nParticles) * 360) % 360;
    ctx.fillStyle = `hsla(${hue},90%,65%,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2.5 * (1 - life * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const AVATAR_FRAME_DRAWERS: Record<AvatarTierId, DrawFn> = {
  newcomer: drawNewcomer,
  standard: drawStandard,
  professional: drawProfessional,
  excellent: drawExcellent,
};
