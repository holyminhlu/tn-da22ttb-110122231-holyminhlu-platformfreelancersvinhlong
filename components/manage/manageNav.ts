export const MANAGE_NAV = [
  { id: "workspace", href: "/manage/phong-lam-viec", labelKey: "manageNav.workspace", exact: true },
  { id: "refunds", href: "/manage/hoan-tien", labelKey: "manageNav.refunds", exact: true },
  { id: "disputes", href: "/manage/tranh-chap", labelKey: "manageNav.disputes", exact: true },
] as const;

export type ManageNavId = (typeof MANAGE_NAV)[number]["id"];

type TranslateFn = (key: string) => string;

export function getManageNav(t: TranslateFn) {
  return MANAGE_NAV.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));
}
