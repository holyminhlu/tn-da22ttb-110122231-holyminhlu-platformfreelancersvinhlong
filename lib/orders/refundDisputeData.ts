export const REFUND_REASON_OPTIONS = [
  { value: "changed_mind", label: "Đổi ý / không cần nữa" },
  { value: "wrong_service", label: "Chọn sai dịch vụ / gói" },
  { value: "payment_method", label: "Thay đổi phương thức thanh toán" },
  { value: "no_response", label: "Nhà cung cấp không phản hồi" },
  { value: "not_started", label: "Dịch vụ chưa được thực hiện" },
  { value: "other", label: "Lý do khác" },
] as const;

export const DISPUTE_ISSUE_OPTIONS = [
  { value: "quality", label: "Chất lượng dịch vụ kém" },
  { value: "not_delivered", label: "Không nhận được hàng / bàn giao" },
  { value: "scope_mismatch", label: "Không đúng phạm vi đã thỏa thuận" },
  { value: "attitude", label: "Thái độ phục vụ" },
  { value: "fraud", label: "Có dấu hiệu lừa đảo" },
  { value: "other", label: "Vấn đề khác" },
] as const;

export const DISPUTE_RESOLUTION_OPTIONS = [
  { value: "refund_100", label: "Hoàn tiền 100%" },
  { value: "refund_50", label: "Hoàn tiền 50%" },
  { value: "redo", label: "Yêu cầu làm lại dịch vụ" },
  { value: "partial_release", label: "Giải ngân một phần cho freelancer" },
  { value: "other", label: "Yêu cầu khác (mô tả thêm)" },
] as const;

export type RefundProgressStep = {
  id: string;
  label: string;
};

export const REFUND_PROGRESS_STEPS: RefundProgressStep[] = [
  { id: "submitted", label: "Đã gửi yêu cầu" },
  { id: "reviewing", label: "Đang xem xét" },
  { id: "processing", label: "Đang xử lý hoàn tiền" },
  { id: "completed", label: "Hoàn tiền thành công" },
];

export const DISPUTE_PROGRESS_STEPS: RefundProgressStep[] = [
  { id: "initiated", label: "Khởi tạo" },
  { id: "awaiting_response", label: "Chờ bên bị khiếu nại" },
  { id: "admin_review", label: "Admin đang xem xét" },
  { id: "decided", label: "Đã có quyết định" },
];

export function refundReasonLabel(code: string | null | undefined): string {
  const found = REFUND_REASON_OPTIONS.find((o) => o.value === code);
  return found?.label ?? code ?? "—";
}

export function disputeIssueLabel(code: string | null | undefined): string {
  const found = DISPUTE_ISSUE_OPTIONS.find((o) => o.value === code);
  return found?.label ?? code ?? "—";
}

export function disputeResolutionLabel(code: string | null | undefined): string {
  const found = DISPUTE_RESOLUTION_OPTIONS.find((o) => o.value === code);
  return found?.label ?? code ?? "—";
}

export function adminResolveActionLabel(code: string | null | undefined): string {
  switch (String(code || "").toLowerCase()) {
    case "full_refund":
      return "Hoàn tiền cho client";
    case "release":
      return "Giải ngân cho freelancer";
    case "dismiss":
      return "Bác tranh chấp — tiếp tục đơn";
    default:
      return code || "—";
  }
}

export function disputeStageLabel(stage: string | null | undefined): string {
  switch (String(stage || "").toLowerCase()) {
    case "initiated":
      return "Khởi tạo";
    case "awaiting_response":
      return "Chờ bên bị khiếu nại";
    case "admin_review":
      return "Admin đang xem xét";
    case "decided":
      return "Đã có quyết định";
    default:
      return stage || "—";
  }
}

export function refundProgressIndex(
  status: string,
  escrowStatus: string | null | undefined,
): number {
  const s = String(status).toLowerCase();
  const escrow = String(escrowStatus || "").toLowerCase();
  if (s === "rejected") return 1;
  if (escrow === "refunded" || s === "approved" || s === "auto_approved") return 3;
  if (s === "pending") return 1;
  return 0;
}

export function disputeProgressIndex(stage: string | null | undefined, status: string): number {
  const st = String(status).toLowerCase();
  if (st === "resolved" || st === "dismissed") return DISPUTE_PROGRESS_STEPS.length;
  const s = String(stage || "initiated").toLowerCase();
  if (s === "admin_review") return 2;
  if (s === "awaiting_response") return 1;
  if (s === "decided") return 3;
  return 0;
}

export function refundMethodLabel(method: string | null | undefined): string {
  if (method === "card") return "Hoàn về thẻ đã thanh toán";
  return "Hoàn về ví VLC";
}

/** Đơn đủ điều kiện yêu cầu hoàn tiền nhanh (chưa bàn giao, đã nạp ký quỹ). */
export function isQuickRefundEligible(input: {
  escrow_status?: string | null;
  workflow_stage?: string | null;
  delivered_at?: string | null;
  progress_entry_count?: number;
}): boolean {
  const escrow = String(input.escrow_status || "").toLowerCase();
  if (escrow !== "funded") return false;
  if (input.delivered_at) return false;
  const stage = String(input.workflow_stage || "").toLowerCase();
  if (stage === "escrow") return true;
  if (stage === "execution") {
    return (input.progress_entry_count ?? 0) === 0;
  }
  return false;
}
