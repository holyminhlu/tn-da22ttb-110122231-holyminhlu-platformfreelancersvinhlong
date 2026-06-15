export const MANAGE_NAV = [
  { id: "workspace", href: "/manage/phong-lam-viec", label: "Phòng làm việc", exact: true },
  { id: "refunds", href: "/manage/hoan-tien", label: "Yêu cầu hoàn tiền", exact: true },
  { id: "disputes", href: "/manage/tranh-chap", label: "Xử lý tranh chấp", exact: true },
] as const;

export type ManageNavId = (typeof MANAGE_NAV)[number]["id"];
