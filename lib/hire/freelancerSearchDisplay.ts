import type { FreelancerProfilePayload, FreelancerSearchRow } from "@/lib/api/freelancers";
import { formatVnd } from "@/lib/format";
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
  const formatted = formatVndUi(amount);
  if (formatted === "—") return "—";
  return `${formatted} /năm`;
}

export function formatHourlyRate(amount: string | number | null | undefined): string | null {
  const formatted = formatVndUi(amount);
  if (formatted === "—") return null;
  return `${formatted}/giờ`;
}

export function formatStartingPrice(amount: string | number | null | undefined): string | null {
  const formatted = formatVndUi(amount);
  if (formatted === "—") return null;
  return `Từ ${formatted}`;
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

/** Gộp featuredService API với mục tương ứng trong danh sách dịch vụ (đủ description). */
export function resolveFeaturedService(data: FreelancerProfilePayload) {
  const raw = data.featuredService;
  if (!raw) return null;
  const fromList = data.services.find((svc) => svc.id === raw.id);
  return {
    ...raw,
    title: raw.title?.trim() || fromList?.title || "",
    description: raw.description?.trim() || fromList?.description?.trim() || null,
    price: raw.price ?? fromList?.price ?? 0,
    category: raw.category?.trim() || fromList?.category?.trim() || null,
    thumbnail_url: raw.thumbnail_url ?? fromList?.thumbnail_url ?? null,
    delivery_days: fromList?.delivery_days ?? null,
  };
}

export function featuredServiceDescriptionText(
  featured: { description?: string | null } | null | undefined,
  freelancerBio?: string | null,
): string {
  const text = featured?.description?.trim() || freelancerBio?.trim();
  return text || "Chưa có mô tả dịch vụ.";
}

export type ActiveFeaturedService = {
  id: string;
  title: string;
  description: string | null;
  price: string | number;
  category: string | null;
  thumbnail_url: string | null;
  delivery_days: number | null;
};

export function resolveActiveService(
  data: FreelancerProfilePayload,
  selectedId: string | null | undefined,
): ActiveFeaturedService | null {
  if (selectedId) {
    const svc = data.services.find((item) => item.id === selectedId);
    if (svc) {
      return {
        id: svc.id,
        title: svc.title,
        description: svc.description ?? null,
        price: svc.price,
        category: svc.category,
        thumbnail_url: svc.thumbnail_url ?? null,
        delivery_days: svc.delivery_days,
      };
    }
  }
  const featured = resolveFeaturedService(data);
  if (!featured) return null;
  const fromList = data.services.find((item) => item.id === featured.id);
  return {
    id: featured.id,
    title: featured.title,
    description: featured.description,
    price: featured.price,
    category: featured.category,
    thumbnail_url: featured.thumbnail_url,
    delivery_days: fromList?.delivery_days ?? null,
  };
}

const DESC_PREVIEW_PARAS = 2;
const DESC_PREVIEW_CHARS = 320;

export function serviceDescriptionPreview(text: string): {
  preview: string;
  needsExpand: boolean;
} {
  const trimmed = text.trim();
  if (!trimmed) return { preview: "", needsExpand: false };

  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > DESC_PREVIEW_PARAS) {
    return {
      preview: paragraphs.slice(0, DESC_PREVIEW_PARAS).join("\n\n"),
      needsExpand: true,
    };
  }
  if (trimmed.length > DESC_PREVIEW_CHARS) {
    return {
      preview: `${trimmed.slice(0, DESC_PREVIEW_CHARS).trimEnd()}…`,
      needsExpand: true,
    };
  }
  return { preview: trimmed, needsExpand: false };
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
