/** Chính sách hoàn tiền / hủy đơn — dùng chung frontend (preview) */

export const PLATFORM_FEE_RATE = 0.1;

export const LEGITIMATE_REFUND_REASONS = new Set([
  "no_response",
  "not_started",
  "wrong_service",
]);

export const UNJUSTIFIED_REFUND_REASONS = new Set(["changed_mind", "payment_method"]);

export type RefundLegitimacy = "legitimate" | "unjustified" | "needs_review";

export type RefundSplitType = "full_refund" | "split_50_50" | "penalty_refund";

export type RefundSettlementInput = {
  agreedPrice: string | number | null;
  workflowStage?: string | null;
  hasProgress?: boolean;
  reasonCode?: string | null;
  legitimacyOverride?: RefundLegitimacy | null;
  penaltyPercent?: number | null;
};

export type RefundSettlement = {
  total: number;
  legitimacy: RefundLegitimacy;
  splitType: RefundSplitType;
  penaltyPercent: number;
  workDonePercent: number;
  clientAmount: number;
  freelancerAmount: number;
  platformFeeAmount: number;
  platformFeeNote: string;
  summary: string;
};

function roundVnd(n: number) {
  return Math.max(0, Math.round(n));
}

export function classifyRefundLegitimacy(reasonCode: string | null | undefined): RefundLegitimacy {
  const code = String(reasonCode || "").toLowerCase();
  if (LEGITIMATE_REFUND_REASONS.has(code)) return "legitimate";
  if (UNJUSTIFIED_REFUND_REASONS.has(code)) return "unjustified";
  if (code === "other") return "needs_review";
  return "needs_review";
}

export function legitimacyLabel(legitimacy: RefundLegitimacy): string {
  switch (legitimacy) {
    case "legitimate":
      return "Chính đáng";
    case "unjustified":
      return "Không chính đáng / hủy ngang";
    case "needs_review":
      return "Chờ admin xem xét";
    default:
      return legitimacy;
  }
}

export function splitTypeLabel(splitType: RefundSplitType): string {
  switch (splitType) {
    case "full_refund":
      return "Hoàn 100% cho Client";
    case "split_50_50":
      return "Chia 50% — 50%";
    case "penalty_refund":
      return "Phí phạt + thanh toán phần việc đã làm";
    default:
      return splitType;
  }
}

export function computeRefundSettlement(input: RefundSettlementInput): RefundSettlement {
  const total = roundVnd(Number(input.agreedPrice) || 0);
  const stage = String(input.workflowStage || "").toLowerCase();
  const hasProgress = Boolean(input.hasProgress);
  const legitimacy = input.legitimacyOverride ?? classifyRefundLegitimacy(input.reasonCode);
  const penaltyPct = Math.min(0.25, Math.max(0.1, input.penaltyPercent ?? 0.15));

  const platformFeeNote =
    "Hoa hồng nền tảng (~10%) áp dụng khi giải ngân cho Freelancer, không trừ vào số hiển thị ở giai đoạn chia 50/50.";

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
      platformFeeNote,
      summary: "Không có số tiền ký quỹ.",
    };
  }

  const treatAsLegitimate = legitimacy === "legitimate";
  const treatAsUnjustified = legitimacy === "unjustified" || legitimacy === "needs_review";

  // Giai đoạn 2 (escrow) hoặc GĐ3 chưa có tiến độ + lý do chính đáng → hoàn 100%
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
      platformFeeNote,
      summary: "Hoàn 100% ký quỹ về ví VLC cho Client.",
    };
  }

  // Giai đoạn 3 có tiến độ + chính đáng → 50/50
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
      platformFeeNote,
      summary:
        "Hủy chính đáng ở Giai đoạn 3: Client nhận 50%, Freelancer nhận 50% (chưa trừ hoa hồng nền tảng).",
    };
  }

  // Hủy không chính đáng / hủy ngang
  if (treatAsUnjustified) {
    const workDonePercent = stage === "execution" && hasProgress ? 50 : 0;
    const penaltyAmount = roundVnd(total * penaltyPct);
    const workDoneAmount = roundVnd(total * (workDonePercent / 100));
    const freelancerAmount = penaltyAmount + workDoneAmount;
    const clientAmount = Math.max(0, total - freelancerAmount);
    const platformFeeAmount = freelancerAmount > 0 ? roundVnd(freelancerAmount * PLATFORM_FEE_RATE) : 0;

    return {
      total,
      legitimacy,
      splitType: "penalty_refund",
      penaltyPercent: penaltyPct,
      workDonePercent,
      clientAmount,
      freelancerAmount,
      platformFeeAmount,
      platformFeeNote,
      summary:
        workDonePercent > 0
          ? `Phí phạt ${Math.round(penaltyPct * 100)}% + thanh toán ${workDonePercent}% phần việc đã làm cho Freelancer. Phần còn lại hoàn về ví VLC.`
          : `Phí phạt ${Math.round(penaltyPct * 100)}% tổng giá trị. Phần còn lại hoàn về ví VLC.`,
    };
  }

  // needs_review at stage 3 with progress — preview conservative (penalty path)
  return computeRefundSettlement({
    ...input,
    legitimacyOverride: "unjustified",
  });
}

export function isRefundRequestAllowed(input: {
  escrow_status?: string | null;
  workflow_stage?: string | null;
  delivered_at?: string | null;
}): boolean {
  if (String(input.escrow_status || "").toLowerCase() !== "funded") return false;
  if (input.delivered_at) return false;
  const stage = String(input.workflow_stage || "").toLowerCase();
  return stage === "escrow" || stage === "execution";
}
