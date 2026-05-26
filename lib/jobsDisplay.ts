import { apiUrl, getApiBaseUrl } from "@/config/api.config";
import { parseJsonArray } from "@/lib/format";

export function relativePosted(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff) || diff < 0) return "vừa xong";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function resolveJobImageSrc(url?: string | null): string | undefined {
  const trimmed = String(url || "").trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return apiUrl(path, getApiBaseUrl());
}

export function parseJobImages(images: unknown): string[] {
  const raw = parseJsonArray(images);
  return raw
    .map((u) => resolveJobImageSrc(u))
    .filter((u): u is string => Boolean(u));
}

export function parseJobTags(tags: unknown): string[] {
  return parseJsonArray(tags).slice(0, 12);
}

export function proposalCountLabel(count: number): string {
  if (count <= 0) return "Chưa có đơn ứng tuyển";
  return `${count} đơn ứng tuyển`;
}
