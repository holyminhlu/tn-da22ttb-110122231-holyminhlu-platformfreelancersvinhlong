export type AvatarTierId = "newcomer" | "standard" | "professional" | "excellent";

export type AvatarTierMeta = {
  id: AvatarTierId;
  label: string;
  badgeText: string;
  baseAvatar: number;
  baseCanvas: number;
};

export const AVATAR_TIERS: Record<AvatarTierId, AvatarTierMeta> = {
  newcomer: {
    id: "newcomer",
    label: "Người mới",
    badgeText: "Newcomer",
    baseAvatar: 100,
    baseCanvas: 160,
  },
  standard: {
    id: "standard",
    label: "Tiêu chuẩn",
    badgeText: "Standard",
    baseAvatar: 100,
    baseCanvas: 170,
  },
  professional: {
    id: "professional",
    label: "Chuyên nghiệp",
    badgeText: "Professional",
    baseAvatar: 100,
    baseCanvas: 180,
  },
  excellent: {
    id: "excellent",
    label: "Xuất sắc",
    badgeText: "✦ Elite",
    baseAvatar: 108,
    baseCanvas: 200,
  },
};

/** Phân cấp theo số đơn hàng đã hoàn thành (status = completed). */
export function getAvatarTierId(completedJobs: number | null | undefined): AvatarTierId {
  const n = Math.max(0, Number(completedJobs) || 0);
  if (n <= 5) return "newcomer";
  if (n <= 20) return "standard";
  if (n <= 50) return "professional";
  return "excellent";
}

export function getAvatarTier(completedJobs: number | null | undefined): AvatarTierMeta {
  return AVATAR_TIERS[getAvatarTierId(completedJobs)];
}

export function getAvatarFrameSizes(completedJobs: number | null | undefined, avatarSize: number) {
  const tier = getAvatarTier(completedJobs);
  const scale = avatarSize / tier.baseAvatar;
  return {
    tier,
    avatarSize,
    canvasSize: Math.ceil(tier.baseCanvas * scale),
  };
}

export type AvatarTierThreshold = {
  id: AvatarTierId;
  label: string;
  minOrders: number;
  previewOrders: number;
};

/** Ngưỡng mở khóa từng khung danh hiệu (theo đơn hoàn thành). */
export const AVATAR_TIER_THRESHOLDS: AvatarTierThreshold[] = [
  { id: "newcomer", label: "Người mới", minOrders: 0, previewOrders: 0 },
  { id: "standard", label: "Tiêu chuẩn", minOrders: 6, previewOrders: 10 },
  { id: "professional", label: "Chuyên nghiệp", minOrders: 21, previewOrders: 30 },
  { id: "excellent", label: "Xuất sắc", minOrders: 51, previewOrders: 55 },
];

export function isAvatarTierUnlocked(
  completedJobs: number | null | undefined,
  minOrders: number,
): boolean {
  const n = Math.max(0, Number(completedJobs) || 0);
  return n >= minOrders;
}
