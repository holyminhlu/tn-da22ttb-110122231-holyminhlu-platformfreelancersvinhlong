export const SERVICES_NAV = [
  { id: "create", href: "/dich-vu/tao-moi", label: "Đăng dịch vụ mới", exact: true },
  { id: "manage", href: "/dich-vu/quan-ly", label: "Quản lý dịch vụ", exact: true },
  { id: "orders", href: "/dich-vu/don-hang", label: "Đơn hàng dịch vụ", exact: true },
  { id: "reviews", href: "/dich-vu/danh-gia", label: "Đánh giá & Phản hồi", exact: true },
] as const;

export type ServicesNavId = (typeof SERVICES_NAV)[number]["id"];
