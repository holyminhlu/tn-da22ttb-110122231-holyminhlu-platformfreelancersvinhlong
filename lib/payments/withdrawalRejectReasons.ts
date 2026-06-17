export const WITHDRAWAL_REJECT_REASONS = [
  { code: "bank_info_invalid", label: "Thông tin tài khoản ngân hàng không hợp lệ" },
  { code: "amount_mismatch", label: "Số tiền / giao dịch không khớp" },
  { code: "policy_violation", label: "Vi phạm chính sách nền tảng" },
  { code: "duplicate_request", label: "Yêu cầu trùng lặp" },
  { code: "fraud_suspected", label: "Nghi ngờ gian lận" },
  { code: "other", label: "Khác (ghi chú bắt buộc)" },
] as const;

export type WithdrawalRejectReasonCode = (typeof WITHDRAWAL_REJECT_REASONS)[number]["code"];

export function withdrawalRejectReasonLabel(code: string | null | undefined): string {
  const found = WITHDRAWAL_REJECT_REASONS.find((item) => item.code === code);
  return found?.label || code || "Không xác định";
}

export function buildWithdrawalRejectMessage(
  reasonCode: string,
  adminNote?: string | null,
): string {
  const label = withdrawalRejectReasonLabel(reasonCode);
  const note = String(adminNote || "").trim();
  if (reasonCode === "other" && note) return note;
  if (note) return `${label}. Ghi chú: ${note}`;
  return label;
}
