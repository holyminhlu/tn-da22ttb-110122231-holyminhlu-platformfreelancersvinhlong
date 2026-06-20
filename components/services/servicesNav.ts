import { tUi } from "@/lib/i18n/runtime";
export const SERVICES_NAV = [
  { id: "create", href: "/dich-vu/tao-moi", label: "Đăng dịch vụ mới", exact: true },
  { id: "manage", href: "/dich-vu/quan-ly", label: "Quản lý dịch vụ", exact: true },
  { id: "orders", href: "/dich-vu/don-hang", label: "Đơn hàng dịch vụ", exact: true },
  { id: "refunds", href: "/dich-vu/hoan-tien", label: "Yêu cầu hoàn tiền", exact: true },
  { id: "disputes", href: "/dich-vu/tranh-chap", label: "Xử lý tranh chấp", exact: true },
  { id: "reviews", href: "/dich-vu/danh-gia", label: "Đánh giá & Phản hồi", exact: true },
] as const;

export type ServicesNavId = (typeof SERVICES_NAV)[number]["id"];

type TranslateFn = (keyOrVi: string) => string;

export function getServicesNav(t: TranslateFn) {
  return SERVICES_NAV.map((item) => ({
    ...item,
    label: tUi(item.label),
  }));
}
