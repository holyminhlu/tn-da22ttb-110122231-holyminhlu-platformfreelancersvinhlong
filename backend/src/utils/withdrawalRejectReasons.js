const WITHDRAWAL_REJECT_REASONS = [
  { code: "bank_info_invalid", label: "Thông tin tài khoản ngân hàng không hợp lệ" },
  { code: "amount_mismatch", label: "Số tiền / giao dịch không khớp" },
  { code: "policy_violation", label: "Vi phạm chính sách nền tảng" },
  { code: "duplicate_request", label: "Yêu cầu trùng lặp" },
  { code: "fraud_suspected", label: "Nghi ngờ gian lận" },
  { code: "other", label: "Khác" },
];

const REASON_CODES = new Set(WITHDRAWAL_REJECT_REASONS.map((item) => item.code));

function withdrawalRejectReasonLabel(code) {
  const found = WITHDRAWAL_REJECT_REASONS.find((item) => item.code === code);
  return found?.label || code || "Không xác định";
}

function buildWithdrawalRejectMessage(reasonCode, adminNote) {
  const label = withdrawalRejectReasonLabel(reasonCode);
  const note = String(adminNote || "").trim();
  if (reasonCode === "other" && note) return note;
  if (note) return `${label}. Ghi chú: ${note}`;
  return label;
}

module.exports = {
  WITHDRAWAL_REJECT_REASONS,
  REASON_CODES,
  withdrawalRejectReasonLabel,
  buildWithdrawalRejectMessage,
};
