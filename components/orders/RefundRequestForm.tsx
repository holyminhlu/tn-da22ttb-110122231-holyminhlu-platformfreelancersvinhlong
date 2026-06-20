"use client";

import { tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useMemo, useState } from "react";
import type { RefundRequestPayload } from "@/lib/api/resolution";
import { REFUND_REASON_OPTIONS } from "@/lib/orders/refundDisputeData";
import { computeRefundSettlement } from "@/lib/orders/refundSettlement";
import RefundSettlementBreakdown from "./RefundSettlementBreakdown";

type RefundRequestFormProps = {
  agreedPrice: string | number | null;
  workflowStage?: string | null;
  hasProgress?: boolean;
  eligible?: boolean;
  busy?: boolean;
  onSubmit: (payload: RefundRequestPayload) => void;
};

export default function RefundRequestForm({
  agreedPrice,
  workflowStage,
  hasProgress = false,
  eligible = true,
  busy,
  onSubmit,
}: RefundRequestFormProps) {  const { t, formatVnd } = useTranslation();

  const [reasonCode, setReasonCode] = useState("");
  const [detail, setDetail] = useState("");

  const needsOtherDetail = reasonCode === "other";
  const otherDetailOk = !needsOtherDetail || detail.trim().length >= 10;
  const canSubmit = Boolean(reasonCode) && otherDetailOk && eligible;

  const settlementPreview = useMemo(() => {
    if (!reasonCode || !eligible) return null;
    return computeRefundSettlement({
      agreedPrice,
      workflowStage,
      hasProgress,
      reasonCode,
    });
  }, [agreedPrice, workflowStage, hasProgress, reasonCode, eligible]);

  function handleSubmit() {
  const t = tUi;
  const formatVnd = formatVndUi;
    if (!canSubmit) return;
    onSubmit({ reasonCode, detail: detail.trim() || undefined, refundMethod: "wallet" });
  }

  return (
    <div className="resolution-form">
      <header className="resolution-form__head">
        <h4 className="resolution-form__title">{t("Yêu cầu hoàn tiền")}</h4>
        <p className="resolution-form__sub">
          Hệ thống phân loại lý do chính đáng / không chính đáng để tính mức hoàn. Freelancer có 3
          ngày phản hồi; nếu lý do &quot;khác&quot;, admin sẽ xem xét trước khi quyết định.
        </p>
      </header>

      <div className="resolution-form__refund-box resolution-form__refund-box--wallet">
        <div>
          <span className="resolution-form__refund-label">{t("Phương thức nhận lại")}</span>
          <strong className="resolution-form__refund-amount">{t("Ví VLC (mặc định)")}</strong>
        </div>
        <div>
          <span className="resolution-form__refund-label">{t("Tổng ký quỹ")}</span>
          <strong className="resolution-form__refund-amount">
            {agreedPrice != null ? formatVndUi(agreedPrice) : "—"}
          </strong>
        </div>
      </div>

      <label className="resolution-form__field">
        <span>
          Lý do hủy <span className="resolution-form__required">*</span>
        </span>
        <select
          className="resolution-form__select"
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          disabled={!eligible}
        >
          <option value="">{t("— Chọn lý do —")}</option>
          {REFUND_REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="resolution-form__field">
        <span>
          {needsOtherDetail ? (
            <>
              Mô tả lý do khác <span className="resolution-form__required">*</span>
            </>
          ) : (
            "Chi tiết thêm (tùy chọn)"
          )}
        </span>
        <textarea
          className="resolution-form__textarea"
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={
            needsOtherDetail
              ? "Nhập lý do cụ thể của bạn (tối thiểu 10 ký tự)..."
              : "Mô tả thêm nếu cần..."
          }
          disabled={!eligible}
          required={needsOtherDetail}
          minLength={needsOtherDetail ? 10 : undefined}
        />
        {needsOtherDetail ? (
          <span className="resolution-form__hint">{detail.trim().length}/10 ký tự tối thiểu</span>
        ) : null}
      </label>

      {settlementPreview ? (
        <RefundSettlementBreakdown
          agreedPrice={agreedPrice}
          workflowStage={workflowStage}
          hasProgress={hasProgress}
          reasonCode={reasonCode}
          legitimacy={settlementPreview.legitimacy}
          splitType={settlementPreview.splitType}
          penaltyPercent={settlementPreview.penaltyPercent}
          clientAmount={settlementPreview.clientAmount}
          freelancerAmount={settlementPreview.freelancerAmount}
          platformFeeAmount={settlementPreview.platformFeeAmount}
          audience="client"
          compact
        />
      ) : null}

      {!eligible ? (
        <p className="resolution-form__hint resolution-form__hint--warn">
          Yêu cầu hoàn tiền chỉ khả dụng khi đã nạp ký quỹ và chưa bàn giao. Nếu đã bàn giao, hãy
          mở tranh chấp.
        </p>
      ) : null}

      <button
        type="button"
        className="resolution-form__btn"
        disabled={busy || !canSubmit}
        onClick={handleSubmit}
      >
        {busy ? "Đang gửi..." : "Gửi yêu cầu hoàn tiền"}
      </button>
    </div>
  );
}
