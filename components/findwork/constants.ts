import type { JobSort } from "@/lib/api/jobs";

/** Danh mục mặc định (trùng service_categories) khi API chưa có job gắn category */
export const DEFAULT_JOB_CATEGORIES = [
  "Thiết kế đồ họa & Logo",
  "UI/UX & Thiết kế website",
  "Lập trình Web & Ứng dụng",
  "Mobile App",
  "Marketing & SEO",
  "Nội dung & Copywriting",
  "Video & Hoạt ảnh",
  "Dữ liệu & AI",
  "Hỗ trợ kỹ thuật & IT",
  "Khác",
] as const;

export const JOB_SORT_OPTIONS: { value: JobSort; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "budget_desc", label: "Ngân sách cao → thấp" },
  { value: "budget_asc", label: "Ngân sách thấp → cao" },
  { value: "proposals_desc", label: "Nhiều đơn ứng tuyển" },
  { value: "proposals_asc", label: "Ít đơn ứng tuyển" },
];

export type ClientCriteria = "all" | "verified" | "with_location";

export const CLIENT_CRITERIA_OPTIONS: { value: ClientCriteria; label: string }[] = [
  { value: "all", label: "Tất cả nhà tuyển dụng" },
  { value: "verified", label: "Email đã xác minh" },
  { value: "with_location", label: "Có thông tin địa điểm" },
];
