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

export function relativePostedEn(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff) || diff < 0) return "Posted just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Posted ${mins || 1} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Posted ${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  return `Posted on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function quotesCountLabel(count: number): string {
  if (count <= 0) return "No Quotes Received";
  return count === 1 ? "1 Quote Received" : `${count} Quotes Received`;
}

export function formatCompactUsd(amount: string | number | null | undefined): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatJobBudgetLine(job: {
  budget_type?: string | null;
  budget?: string | number | null;
  budget_max?: string | number | null;
}): string {
  const type = String(job.budget_type || "").trim().toLowerCase();
  const min = formatCompactUsd(job.budget);
  const max = formatCompactUsd(job.budget_max);
  const hasAmount = Boolean(min || max);

  if (!type && !hasAmount) return "Budget not specified";

  if (type === "hourly") {
    return min ? `Hourly | ${min}/hr` : "Hourly";
  }

  if (min && max && Number(job.budget_max) > Number(job.budget)) {
    return `Fixed Price | ${min}-${max}`;
  }
  if (min) return `Fixed Price | ${min}`;
  return "Fixed Price";
}

export function clientDisplayName(fullName?: string | null): string {
  const name = String(fullName || "").trim();
  if (!name) return "Client";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return lastInitial ? `${first} ${lastInitial}` : first;
}

export function clientLocationLabel(job: {
  client_country?: string | null;
  client_district_city?: string | null;
  location_label?: string | null;
}): string {
  return (
    job.client_country?.trim() ||
    job.client_district_city?.trim() ||
    job.location_label?.trim() ||
    "—"
  );
}
