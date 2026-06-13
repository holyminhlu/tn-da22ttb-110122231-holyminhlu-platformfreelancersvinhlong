import type { IconType } from "react-icons";
import {
  FaBell,
  FaBoxOpen,
  FaCommentDots,
  FaFileInvoiceDollar,
  FaStar,
} from "react-icons/fa";

export type NotificationTone = "quote" | "order" | "message" | "review" | "system";

export type NotificationCategoryMeta = {
  label: string;
  tone: NotificationTone;
  Icon: IconType;
};

const CATEGORY_META: Record<string, NotificationCategoryMeta> = {
  quote: { label: "Báo giá", tone: "quote", Icon: FaFileInvoiceDollar },
  order: { label: "Đơn hàng", tone: "order", Icon: FaBoxOpen },
  message: { label: "Tin nhắn", tone: "message", Icon: FaCommentDots },
  review: { label: "Đánh giá", tone: "review", Icon: FaStar },
  system: { label: "Hệ thống", tone: "system", Icon: FaBell },
};

export function getNotificationCategoryMeta(category: string): NotificationCategoryMeta {
  const key = String(category || "system").toLowerCase();
  return CATEGORY_META[key] ?? CATEGORY_META.system;
}
