export const SERVICES_NAV = [
  { id: "create", href: "/dich-vu/tao-moi", labelKey: "servicesNav.create", exact: true },
  { id: "manage", href: "/dich-vu/quan-ly", labelKey: "servicesNav.manage", exact: true },
  { id: "orders", href: "/dich-vu/don-hang", labelKey: "servicesNav.orders", exact: true },
  { id: "refunds", href: "/dich-vu/hoan-tien", labelKey: "servicesNav.refunds", exact: true },
  { id: "disputes", href: "/dich-vu/tranh-chap", labelKey: "servicesNav.disputes", exact: true },
  { id: "reviews", href: "/dich-vu/danh-gia", labelKey: "servicesNav.reviews", exact: true },
] as const;

export type ServicesNavId = (typeof SERVICES_NAV)[number]["id"];

type TranslateFn = (key: string) => string;

export function getServicesNav(t: TranslateFn) {
  return SERVICES_NAV.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));
}
