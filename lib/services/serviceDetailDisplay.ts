import type { MyServiceRow } from "@/lib/api/services";
import { parseJsonArray } from "@/lib/format";
import {
  formatPackagePrice,
  normalizeServiceRevision,
  parseServicePackages,
  type ServicePackage,
} from "@/lib/hire/servicePackages";

export type ServiceFaq = { q: string; a: string };

export function parseServiceFaqs(raw: unknown): ServiceFaq[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      return [];
    }
  }
  return list
    .map((item) => {
      const row = item as Record<string, unknown>;
      const q = String(row?.q ?? row?.question ?? "").trim();
      const a = String(row?.a ?? row?.answer ?? "").trim();
      return q && a ? { q, a } : null;
    })
    .filter((x): x is ServiceFaq => x != null);
}

export function parseServiceTags(raw: unknown): string[] {
  return parseJsonArray(raw);
}

export function parseServiceGallery(raw: unknown): string[] {
  return parseJsonArray(raw).slice(0, 12);
}

export function parseDemoMedia(
  raw: unknown,
): { url: string; kind: string } | null {
  if (!raw || typeof raw !== "object") {
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        return parseDemoMedia(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }
  const row = raw as Record<string, unknown>;
  const url = String(row.url || "").trim();
  if (!url) return null;
  return { url, kind: String(row.kind || "video") };
}

export function parseRequirementsLines(requirements: string | null | undefined): string[] {
  if (!requirements?.trim()) return [];
  const lines = requirements
    .split(/\n+/)
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  const noteIdx = lines.findIndex((l) => /^ghi chú thêm:/i.test(l));
  if (noteIdx >= 0) return lines.slice(0, noteIdx);
  return lines;
}

export function parseRequirementsNotes(requirements: string | null | undefined): string | null {
  if (!requirements?.trim()) return null;
  const match = requirements.match(/ghi chú thêm:\s*([\s\S]*)$/i);
  return match?.[1]?.trim() || null;
}

export function servicePackagesForRow(service: MyServiceRow): ServicePackage[] {
  return parseServicePackages(service.packages, service.price, service.delivery_days);
}

export function servicePackagesForPublic(service: {
  packages?: unknown;
  price: string | number;
  delivery_days?: number | null;
}): ServicePackage[] {
  return parseServicePackages(service.packages, service.price, service.delivery_days ?? null);
}

export function packagePriceLabel(packs: ServicePackage[]): string {
  if (packs.length === 0) return "—";
  if (packs.length === 1) return formatPackagePrice(packs[0].price);
  const min = Math.min(...packs.map((p) => p.price));
  const max = Math.max(...packs.map((p) => p.price));
  if (min === max) return formatPackagePrice(min);
  return `${formatPackagePrice(min)} – ${formatPackagePrice(max)}`;
}

export function isSinglePackagePricing(packs: ServicePackage[]): boolean {
  return packs.length === 1 && packs[0]?.name === "Trọn gói";
}

export type ServiceFormSnapshot = {
  title: string;
  category: string;
  tagsInput: string;
  description: string;
  requirementItems: string[];
  requirementNotes: string;
  pricingMode: "single" | "packages";
  basePrice: string;
  deliveryDays: string;
  singleRevisions: string;
  packages: ServicePackage[];
  faqs: ServiceFaq[];
  thumbnailUrl: string | null;
  mediaUrls: string[];
  demoUrl: string | null;
  listingStatus: string;
};

export function serviceFormFromRow(service: MyServiceRow): ServiceFormSnapshot {
  const packs = servicePackagesForRow(service);
  const single = isSinglePackagePricing(packs);
  const primary = packs[0];
  const standard = packs.find((p) => p.id === "standard") ?? primary;
  const reqLines = parseRequirementsLines(service.requirements);
  const faqList = parseServiceFaqs(service.faqs);
  const demo = parseDemoMedia(service.demo_media);
  const priceBase = single
    ? primary?.price ?? Number(service.price)
    : standard?.price ?? Number(service.price);
  const daysBase = single
    ? primary?.deliveryDays ?? service.delivery_days ?? 5
    : standard?.deliveryDays ?? service.delivery_days ?? 5;

  return {
    title: service.title?.trim() || "",
    category: service.category?.trim() || "",
    tagsInput: parseServiceTags(service.tech_stack).join(", "),
    description: service.description?.trim() || "",
    requirementItems: reqLines.length > 0 ? reqLines : [""],
    requirementNotes: parseRequirementsNotes(service.requirements) || "",
    pricingMode: single ? "single" : "packages",
    basePrice: String(Math.round(Number(priceBase) || 1500000)),
    deliveryDays: String(daysBase || 5),
    singleRevisions: normalizeServiceRevision(primary?.revisions || "2 lần"),
    packages: single ? packs : packs.length > 0 ? packs : parseServicePackages(null, priceBase, daysBase),
    faqs: faqList.length > 0 ? faqList : [{ q: "", a: "" }],
    thumbnailUrl: service.thumbnail_url,
    mediaUrls: parseServiceGallery(service.media_urls),
    demoUrl: demo?.url ?? null,
    listingStatus: String(service.listing_status || "draft").toLowerCase(),
  };
}
