import type { JobListing } from "@/lib/api/jobs";

/** Trạng thái báo giá của freelancer trên trang chi tiết việc */
export type FreelancerJobQuotePhase =
  | "none"
  | "pending"
  | "interviewing"
  | "offered"
  | "accepted"
  | "declined";

export function resolveFreelancerJobQuotePhase(job: JobListing): FreelancerJobQuotePhase {
  if (job.my_contract_id) return "accepted";
  const status = String(job.my_quote_status || "").toLowerCase();
  if (status === "accepted") return "accepted";
  if (status === "offered") return "offered";
  if (status === "interviewing") return "interviewing";
  if (status === "pending" || status === "shortlisted") return "pending";
  if (status === "declined") return "declined";
  return "none";
}

/** Freelancer không được gửi báo giá mới khi đang có hồ sơ active */
export function blocksNewJobQuote(job: JobListing): boolean {
  const phase = resolveFreelancerJobQuotePhase(job);
  return ["pending", "interviewing", "offered", "accepted"].includes(phase);
}

export function freelancerQuotePhaseLabel(phase: FreelancerJobQuotePhase): string {
  if (phase === "pending") return "Đang chờ khách hàng xem xét";
  if (phase === "interviewing") return "Khách hàng muốn trao đổi / phỏng vấn";
  if (phase === "offered") return "Khách hàng đã gửi offer";
  if (phase === "accepted") return "Đã được chọn — làm việc";
  if (phase === "declined") return "Báo giá bị từ chối";
  return "";
}

export function freelancerQuotePhaseDescription(phase: FreelancerJobQuotePhase): string {
  if (phase === "pending") {
    return "Bạn đã gửi báo giá. Khách hàng đang xem xét — bạn không thể gửi báo giá mới cho cùng công việc này.";
  }
  if (phase === "interviewing") {
    return "Khách hàng muốn trao đổi thêm trước khi quyết định. Hãy phản hồi qua tin nhắn hoặc chờ khách hàng gửi offer.";
  }
  if (phase === "offered") {
    return "Khách hàng chính thức mời bạn nhận việc theo báo giá đã gửi. Chờ khách hàng chốt tuyển để tạo hợp đồng và bắt đầu làm việc.";
  }
  if (phase === "accepted") {
    return "Bạn đã được khách hàng chọn. Mở workspace để theo dõi tiến độ và bàn giao.";
  }
  if (phase === "declined") {
    return "Khách hàng đã từ chối báo giá trước đó. Bạn có thể gửi báo giá mới nếu việc vẫn đang tuyển.";
  }
  return "";
}
