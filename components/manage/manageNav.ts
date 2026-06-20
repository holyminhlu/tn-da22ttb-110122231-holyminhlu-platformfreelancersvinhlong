import { tUi } from "@/lib/i18n/runtime";
export const MANAGE_NAV = [
  { id: "workspace", href: "/manage/phong-lam-viec", label: "Phòng làm việc", exact: true },
  { id: "refunds", href: "/manage/hoan-tien", label: "Yêu cầu hoàn tiền", exact: true },
  { id: "disputes", href: "/manage/tranh-chap", label: "Xử lý tranh chấp", exact: true },
] as const;

export type ManageNavId = (typeof MANAGE_NAV)[number]["id"];

type TranslateFn = (keyOrVi: string) => string;

export function getManageNav(t: TranslateFn) {
  return MANAGE_NAV.map((item) => ({
    ...item,
    label: tUi(item.label),
  }));
}
