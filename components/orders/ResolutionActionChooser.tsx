"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { FaArrowLeft, FaGavel, FaUndoAlt } from "react-icons/fa";
import type { OpenDisputePayload, RefundRequestPayload } from "@/lib/api/resolution";
import DisputeOpenForm from "./DisputeOpenForm";
import RefundRequestForm from "./RefundRequestForm";

type ResolutionAction = "none" | "refund" | "dispute";

type ResolutionActionChooserProps = {
  busy?: boolean;
  showRefund?: boolean;
  refundProps?: {
    agreedPrice: string | number | null;
    workflowStage?: string | null;
    hasProgress?: boolean;
    eligible?: boolean;
    onSubmit: (payload: RefundRequestPayload) => void;
  };
  showDispute?: boolean;
  onOpenDispute?: (payload: OpenDisputePayload) => void;
};

export default function ResolutionActionChooser({
  busy = false,
  showRefund = false,
  refundProps,
  showDispute = false,
  onOpenDispute,
}: ResolutionActionChooserProps) {
  const { t } = useTranslation();

  const [active, setActive] = useState<ResolutionAction>("none");

  const canRefund = showRefund && refundProps;
  const canDispute = showDispute && onOpenDispute;

  if (!canRefund && !canDispute) return null;

  if (active === "refund" && canRefund) {
    return (
      <div className="resolution-actions">
        <button
          type="button"
          className="resolution-actions__back"
          disabled={busy}
          onClick={() => setActive("none")}
        >
          <FaArrowLeft aria-hidden />
          {t("Quay lại")}
        </button>
        <RefundRequestForm
          agreedPrice={refundProps.agreedPrice}
          workflowStage={refundProps.workflowStage}
          hasProgress={refundProps.hasProgress}
          eligible={refundProps.eligible}
          busy={busy}
          onSubmit={refundProps.onSubmit}
        />
      </div>
    );
  }

  if (active === "dispute" && canDispute) {
    return (
      <div className="resolution-actions">
        <button
          type="button"
          className="resolution-actions__back"
          disabled={busy}
          onClick={() => setActive("none")}
        >
          <FaArrowLeft aria-hidden />
          {t("Quay lại")}
        </button>
        <DisputeOpenForm busy={busy} onSubmit={onOpenDispute} />
      </div>
    );
  }

  return (
    <div className="resolution-actions">
      <header className="resolution-actions__head">
        <h4 className="resolution-actions__title">{t("Cần hỗ trợ thêm?")}</h4>
        <p className="resolution-actions__sub">
          {canRefund && canDispute
            ? t("Chọn một trong các tuỳ chọn bên dưới để gửi yêu cầu hoàn tiền hoặc mở tranh chấp.")
            : canRefund
              ? t("Nhấn bên dưới để gửi yêu cầu hoàn tiền.")
              : t("Nhấn bên dưới để mở tranh chấp với admin hỗ trợ.")}
        </p>
      </header>
      <div className="resolution-actions__buttons">
        {canRefund ? (
          <button
            type="button"
            className="resolution-actions__btn resolution-actions__btn--refund"
            disabled={busy}
            onClick={() => setActive("refund")}
          >
            <FaUndoAlt aria-hidden />
            {t("Yêu cầu hoàn tiền")}
          </button>
        ) : null}
        {canDispute ? (
          <button
            type="button"
            className="resolution-actions__btn resolution-actions__btn--dispute"
            disabled={busy}
            onClick={() => setActive("dispute")}
          >
            <FaGavel aria-hidden />
            {t("Mở tranh chấp")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
