export const FINDWORK_NAV = [
  { id: "find", href: "/findwork", label: "Tìm việc làm", exact: true },
  { id: "saved", href: "/findwork/saved", label: "Công việc đã lưu", exact: true },
  { id: "jobs", href: "/jobs", label: "Hợp đồng việc", exact: true },
  { id: "leads", href: "/findwork/leads", label: "Khách hàng tiềm năng", exact: true },
  { id: "quotes", href: "/findwork/quotes", label: "Báo giá job", exact: true },
  { id: "messages", href: "/findwork/messages", label: "Tin nhắn", exact: true },
] as const;

export type FindworkNavId = (typeof FINDWORK_NAV)[number]["id"];
