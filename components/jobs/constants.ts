export type JobsFilter =
  | "all"
  | "completed"
  | "archived"
  | "safepay"
  | "archived_safepay";

export const JOBS_FILTER_OPTIONS: { value: JobsFilter; label: string }[] = [
  { value: "all", label: "Tất cả các công việc" },
  { value: "completed", label: "Công việc đã hoàn thành" },
  { value: "archived", label: "Việc làm đã lưu trữ" },
  { value: "safepay", label: "Việc làm có quỹ SafePay" },
  { value: "archived_safepay", label: "Các công việc đã lưu trữ có sử dụng quỹ SafePay" },
];

export type JobsSort = "recent" | "oldest" | "title";

export const JOBS_SORT_OPTIONS: { value: JobsSort; label: string }[] = [
  { value: "recent", label: "Hoạt động gần đây" },
  { value: "oldest", label: "Cũ nhất trước" },
  { value: "title", label: "Theo tên công việc" },
];
