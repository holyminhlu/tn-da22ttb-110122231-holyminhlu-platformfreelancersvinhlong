import type { FreelancerSearchRow } from "@/lib/api/freelancers";
import { resolveJobImageSrc } from "@/lib/jobsDisplay";

export function parseProfileBadges(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((b) => String(b).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.map((b) => String(b).trim()).filter(Boolean);
    } catch {
      return raw.trim() ? [raw.trim()] : [];
    }
  }
  return [];
}

export function displayMembershipBadges(badges: string[]): string[] {
  if (badges.length > 0) return badges.slice(0, 3);
  return ["MEMBER"];
}

export function formatYearlyEarnings(amount: string | number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n) + " /yr"
  );
}

export function formatHourlyRate(amount: string | number | null | undefined): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n) + "/hr"
  );
}

export function formatStartingPrice(amount: string | number | null | undefined): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    "Starting at " +
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n)
  );
}

export function satisfactionPercent(row: FreelancerSearchRow): number {
  if (row.job_success_score != null && row.job_success_score > 0) {
    return Math.min(100, Math.round(row.job_success_score));
  }
  const avg = Number(row.rating_avg);
  if (!Number.isFinite(avg) || avg <= 0) return 0;
  return Math.min(100, Math.round((avg / 5) * 100));
}

export function resolveFreelancerMedia(url?: string | null): string | undefined {
  return resolveJobImageSrc(url);
}

export function featuredServiceTitle(row: FreelancerSearchRow): string {
  return row.featured_service_title?.trim() || row.title?.trim() || "Freelancer";
}

export function featuredDescription(row: FreelancerSearchRow): string {
  const text = row.featured_service_description?.trim() || row.bio?.trim();
  return text || "Chưa có mô tả dịch vụ.";
}

export function locationDisplay(row: {
  location_label?: string | null;
  district_city?: string | null;
}): string {
  return row.location_label?.trim() || row.district_city?.trim() || "—";
}

export function parseLanguages(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return raw.trim() ? [raw.trim()] : [];
    }
  }
  return [];
}

export function parsePortfolioImageUrls(images: unknown): string[] {
  if (!images) return [];
  const list = Array.isArray(images) ? images : [];
  const urls: string[] = [];
  for (const item of list) {
    if (typeof item === "string" && item.trim()) {
      const src = resolveFreelancerMedia(item.trim());
      if (src) urls.push(src);
    } else if (item && typeof item === "object" && "url" in item) {
      const src = resolveFreelancerMedia(String((item as { url: string }).url));
      if (src) urls.push(src);
    }
  }
  return urls;
}

export function minProjectPrice(row: FreelancerSearchRow): number | null {
  const pkg = Number(row.featured_service_min_package);
  const price = Number(row.featured_service_price);
  if (Number.isFinite(pkg) && pkg > 0) return pkg;
  if (Number.isFinite(price) && price > 0) return price;
  const hourly = Number(row.hourly_rate);
  if (Number.isFinite(hourly) && hourly > 0) return hourly;
  return null;
}
