export type ServicePackage = {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  features: string[];
};

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

export function formatPackagePrice(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
