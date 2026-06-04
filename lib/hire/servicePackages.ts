export type ServicePackage = {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  features: string[];
};

/** Lựa chọn số lần chỉnh sửa sau bàn giao (freelancer chọn từ menu). */
export const SERVICE_REVISION_OPTIONS = [
  "Không chỉnh sửa",
  "1 lần",
  "2 lần",
  "3 lần",
  "5 lần",
  "Không giới hạn",
  "Theo thỏa thuận",
] as const;

export type ServiceRevisionOption = (typeof SERVICE_REVISION_OPTIONS)[number];

export function normalizeServiceRevision(value: string): ServiceRevisionOption {
  const trimmed = value.trim();
  if (!trimmed) return "2 lần";
  const exact = SERVICE_REVISION_OPTIONS.find((o) => o === trimmed);
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  const ci = SERVICE_REVISION_OPTIONS.find((o) => o.toLowerCase() === lower);
  if (ci) return ci;
  if (/không giới hạn|unlimited/i.test(trimmed)) return "Không giới hạn";
  if (/không chỉnh|0 lần|no revision/i.test(trimmed)) return "Không chỉnh sửa";
  if (/thỏa thuận/i.test(trimmed)) return "Theo thỏa thuận";
  const numMatch = trimmed.match(/(\d+)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (n === 1) return "1 lần";
    if (n === 2) return "2 lần";
    if (n === 3) return "3 lần";
    if (n === 5) return "5 lần";
  }
  return "2 lần";
}

export function parseServicePackages(
  raw: unknown,
  basePrice: string | number,
  deliveryDays: number | null,
): ServicePackage[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }

  const normalized = list
    .map((pack) => {
      const row = pack as Record<string, unknown>;
      return {
        id: String(row?.id || "").trim().toLowerCase(),
        name: String(row?.name || "").trim(),
        price: Number(row?.price),
        deliveryDays: Number(row?.deliveryDays ?? row?.delivery_days),
        revisions: String(row?.revisions || "").trim(),
        features: Array.isArray(row?.features)
          ? row.features.map((f) => String(f || "").trim()).filter(Boolean)
          : [],
      };
    })
    .filter((p) => p.id && p.name && Number.isFinite(p.price) && p.price > 0);

  if (normalized.length) return normalized;

  const base = Math.max(500000, Number(basePrice) || 1500000);
  const days = Number.isFinite(Number(deliveryDays)) && Number(deliveryDays) > 0 ? Number(deliveryDays) : 5;
  return [
    {
      id: "basic",
      name: "Basic",
      price: Math.round(base * 0.7),
      deliveryDays: Math.max(2, days - 2),
      revisions: "1 lần",
      features: ["Phạm vi cơ bản", "Bàn giao đúng hạn"],
    },
    {
      id: "standard",
      name: "Standard",
      price: Math.round(base),
      deliveryDays: days,
      revisions: "2 lần",
      features: ["Phạm vi tiêu chuẩn", "Hỗ trợ chỉnh sửa"],
    },
    {
      id: "premium",
      name: "Premium",
      price: Math.round(base * 1.5),
      deliveryDays: days + 3,
      revisions: "Không giới hạn",
      features: ["Ưu tiên hỗ trợ", "Tư vấn mở rộng"],
    },
  ];
}

export function buildDefaultServicePackages(
  basePrice: string | number,
  deliveryDays: number | null,
): ServicePackage[] {
  return parseServicePackages(null, basePrice, deliveryDays);
}

export function formatPackagePrice(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
