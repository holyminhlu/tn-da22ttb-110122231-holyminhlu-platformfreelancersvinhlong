"use client";

import { formatVndUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import {
  computeRefundSettlement,
  legitimacyLabel,
  splitTypeLabel,
  type RefundLegitimacy,
  type RefundSettlement,
  type RefundSplitType,
} from "@/lib/orders/refundSettlement";

type RefundSettlementBreakdownProps = {
  agreedPrice: string | number | null;
  workflowStage?: string | null;
  hasProgress?: boolean;
  reasonCode?: string | null;
  legitimacy?: RefundLegitimacy | string | null;
  splitType?: RefundSplitType | string | null;
  penaltyPercent?: number | string | null;
  clientAmount?: number | string | null;
  freelancerAmount?: number | string | null;
  platformFeeAmount?: number | string | null;
  audience?: "client" | "freelancer" | "admin";
  compact?: boolean;
};

function toSettlementFromStored(props: RefundSettlementBreakdownProps): RefundSettlement | null {
  if (props.clientAmount == null && props.freelancerAmount == null) return null;
  const clientAmount = Number(props.clientAmount) || 0;
  const freelancerAmount = Number(props.freelancerAmount) || 0;
  const total = clientAmount + freelancerAmount;
  return {
    total,
    legitimacy: (props.legitimacy as RefundLegitimacy) || "needs_review",
    splitType: (props.splitType as RefundSplitType) || "full_refund",
    penaltyPercent: Number(props.penaltyPercent) || 0,
    workDonePercent: 0,
    clientAmount,
    freelancerAmount,
    platformFeeAmount: Number(props.platformFeeAmount) || 0,
    platformFeeNote:
      "Hoa hồng nền tảng (~10%) áp dụng khi giải ngân cho Freelancer, không trừ vào số hiển thị ở giai đoạn chia 50/50.",
    summary: splitTypeLabel((props.splitType as RefundSplitType) || "full_refund"),
  };
}

export default function RefundSettlementBreakdown(props: RefundSettlementBreakdownProps) {  const { t, formatVnd } = useTranslation();

  const { audience = "client", compact = false } = props;

  const settlement =
    toSettlementFromStored(props) ??
    computeRefundSettlement({
      agreedPrice: props.agreedPrice,
      workflowStage: props.workflowStage,
      hasProgress: props.hasProgress,
      reasonCode: props.reasonCode,
      legitimacyOverride:
        props.legitimacy === "legitimate" || props.legitimacy === "unjustified"
          ? (props.legitimacy as RefundLegitimacy)
          : null,
      penaltyPercent:
        props.penaltyPercent != null ? Number(props.penaltyPercent) : undefined,
    });

  if (settlement.total <= 0) return null;

  return (
    <div className={`refund-settlement${compact ? " refund-settlement--compact" : ""}`}>
      <div className="refund-settlement__head">
        <span
          className={`refund-settlement__badge refund-settlement__badge--${settlement.legitimacy}`}
        >
          {legitimacyLabel(settlement.legitimacy)}
        </span>
        <span className="refund-settlement__split">{splitTypeLabel(settlement.splitType)}</span>
      </div>

      <p className="refund-settlement__summary">{settlement.summary}</p>

      <dl className="refund-settlement__grid">
        <div>
          <dt>{t("Tổng ký quỹ")}</dt>
          <dd>{formatVndUi(settlement.total)}</dd>
        </div>
        <div className="refund-settlement__row--client">
          <dt>{audience === "freelancer" ? "Client nhận lại" : "Bạn nhận lại (ước tính)"}</dt>
          <dd>{formatVndUi(settlement.clientAmount)}</dd>
        </div>
        {settlement.freelancerAmount > 0 ? (
          <div className="refund-settlement__row--fl">
            <dt>{audience === "client" ? "Freelancer nhận" : "Bạn nhận (ước tính)"}</dt>
            <dd>{formatVndUi(settlement.freelancerAmount)}</dd>
          </div>
        ) : null}
        {settlement.splitType === "penalty_refund" && settlement.penaltyPercent > 0 ? (
          <div>
            <dt>{t("Phí phạt")}</dt>
            <dd>{Math.round(settlement.penaltyPercent * 100)}% tổng giá trị</dd>
          </div>
        ) : null}
        {settlement.platformFeeAmount > 0 ? (
          <div className="refund-settlement__row--fee">
            <dt>{t("Hoa hồng nền tảng (tham chiếu)")}</dt>
            <dd>~{formatVndUi(settlement.platformFeeAmount)}</dd>
          </div>
        ) : null}
      </dl>

      <p className="refund-settlement__note">{settlement.platformFeeNote}</p>
      <p className="refund-settlement__wallet-note">
        Phương thức nhận lại mặc định: <strong>{t("ví VLC")}</strong>.
      </p>
    </div>
  );
}
