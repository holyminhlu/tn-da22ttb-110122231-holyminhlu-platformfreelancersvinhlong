/** Chính sách hoàn tiền / hủy đơn — backend settlement */

const PLATFORM_FEE_RATE = 0.1;

const LEGITIMATE_REFUND_REASONS = new Set(["no_response", "not_started", "wrong_service"]);
const UNJUSTIFIED_REFUND_REASONS = new Set(["changed_mind", "payment_method"]);

function roundVnd(n) {
  return Math.max(0, Math.round(n));
}

function classifyRefundLegitimacy(reasonCode) {
  const code = String(reasonCode || "").toLowerCase();
  if (LEGITIMATE_REFUND_REASONS.has(code)) return "legitimate";
  if (UNJUSTIFIED_REFUND_REASONS.has(code)) return "unjustified";
  if (code === "other") return "needs_review";
  return "needs_review";
}

function computeRefundSettlement(input) {
  const total = roundVnd(Number(input.agreedPrice) || 0);
  const stage = String(input.workflowStage || "").toLowerCase();
  const hasProgress = Boolean(input.hasProgress);
  const legitimacy = input.legitimacyOverride ?? classifyRefundLegitimacy(input.reasonCode);
  const penaltyPct = Math.min(0.25, Math.max(0.1, input.penaltyPercent ?? 0.15));

  if (total <= 0) {
    return {
      total: 0,
      legitimacy,
      splitType: "full_refund",
      penaltyPercent: 0,
      workDonePercent: 0,
      clientAmount: 0,
      freelancerAmount: 0,
      platformFeeAmount: 0,
      summary: "Không có số tiền ký quỹ.",
    };
  }

  const treatAsLegitimate = legitimacy === "legitimate";
  const treatAsUnjustified = legitimacy === "unjustified" || legitimacy === "needs_review";

  if ((stage === "escrow" || (stage === "execution" && !hasProgress)) && treatAsLegitimate) {
    return {
      total,
      legitimacy,
      splitType: "full_refund",
      penaltyPercent: 0,
      workDonePercent: 0,
      clientAmount: total,
      freelancerAmount: 0,
      platformFeeAmount: 0,
      summary: "Hoàn 100% ký quỹ về ví VLC cho Khách hàng.",
    };
  }

  if (stage === "execution" && hasProgress && treatAsLegitimate) {
    const clientAmount = roundVnd(total * 0.5);
    const freelancerAmount = total - clientAmount;
    const platformFeeAmount = roundVnd(freelancerAmount * PLATFORM_FEE_RATE);
    return {
      total,
      legitimacy,
      splitType: "split_50_50",
      penaltyPercent: 0,
      workDonePercent: 50,
      clientAmount,
      freelancerAmount,
      platformFeeAmount,
      summary:
        "Hủy chính đáng Giai đoạn 3: Khách hàng 50%, Freelancer 50% (chưa trừ hoa hồng nền tảng).",
    };
  }

  if (treatAsUnjustified) {
    const workDonePercent = stage === "execution" && hasProgress ? 50 : 0;
    const penaltyAmount = roundVnd(total * penaltyPct);
    const workDoneAmount = roundVnd(total * (workDonePercent / 100));
    const freelancerAmount = penaltyAmount + workDoneAmount;
    const clientAmount = Math.max(0, total - freelancerAmount);
    const platformFeeAmount =
      freelancerAmount > 0 ? roundVnd(freelancerAmount * PLATFORM_FEE_RATE) : 0;

    return {
      total,
      legitimacy,
      splitType: "penalty_refund",
      penaltyPercent: penaltyPct,
      workDonePercent,
      clientAmount,
      freelancerAmount,
      platformFeeAmount,
      summary:
        workDonePercent > 0
          ? `Phí phạt ${Math.round(penaltyPct * 100)}% + thanh toán ${workDonePercent}% việc đã làm.`
          : `Phí phạt ${Math.round(penaltyPct * 100)}% tổng giá trị.`,
    };
  }

  return computeRefundSettlement({ ...input, legitimacyOverride: "unjustified" });
}

module.exports = {
  PLATFORM_FEE_RATE,
  classifyRefundLegitimacy,
  computeRefundSettlement,
};
