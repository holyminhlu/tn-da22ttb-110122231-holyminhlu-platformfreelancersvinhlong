export const HIRE_NAV = [
  { id: "quotes", href: "/hire/quotes", label: "Tuyển dụng" },
  { id: "orders", href: "/hire/orders", label: "Đơn dịch vụ" },
  { id: "favorites", href: "/hire/favorites", label: "Mục yêu thích của tôi" },
  { id: "search", href: "/hire/search", label: "Tìm kiếm người làm việc tự do" },
  { id: "joblist", href: "/hire/joblist", label: "Danh sách việc làm" },
] as const;

export type HireNavId = (typeof HIRE_NAV)[number]["id"];
