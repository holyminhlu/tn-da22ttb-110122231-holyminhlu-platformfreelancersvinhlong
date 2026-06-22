"use client";

import { formatDateUi, formatVndUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { patchContractWorkflow } from "@/lib/api/contracts";
import { listRefundRequests, type RefundRequestRow } from "@/lib/api/resolution";
import { serviceOrderHref } from "@/lib/routes/paths";
import { formatDeadlineCountdown } from "@/lib/orders/workflowSlaDisplay";
import {
  REFUND_PROGRESS_STEPS,
  refundProgressIndex,
  refundReasonLabel,
} from "@/lib/orders/refundDisputeData";
import { legitimacyLabel } from "@/lib/orders/refundSettlement";
import ResolutionProgressBar from "@/components/orders/ResolutionProgressBar";
import RefundSettlementBreakdown from "@/components/orders/RefundSettlementBreakdown";

export type ResolutionAudience = "client" | "freelancer";

type RefundRequestsPanelProps = {
  audience?: ResolutionAudience;
};

function orderTitle(row: RefundRequestRow) {
  return row.job_title || row.service_title || "Đơn hàng";
}

function orderHref(contractId: string, audience: ResolutionAudience) {
  return serviceOrderHref(contractId, audience === "freelancer" ? "freelancer" : "client");
}

function statusLabel(status: string, audience: ResolutionAudience) {
  const s = String(status).toLowerCase();
  if (s === "pending") {
    return audience === "freelancer" ? "Chờ bạn phản hồi" : "Đang chờ phản hồi";
  }
  if (s === "approved") return "Đã xử lý phân bổ";
  if (s === "auto_approved") return "Tự động xử lý";
  if (s === "rejected") return "Bị từ chối";
  return status;
}

function RefundPolicyCard({ audience }: { audience: ResolutionAudience }) {
  if (audience === "client") {
    return (
      <div className="refund-policy-card">
        <h3 className="refund-policy-card__title">Chính sách hoàn tiền (Khách hàng)</h3>
        <ul className="refund-policy-card__list">
          <li>
            <strong>Chính đáng</strong> (chưa làm / FL không phản hồi / sai gói): hoàn 100% về ví
            VLC.
          </li>
          <li>
            <strong>Giai đoạn 3 có tiến độ + chính đáng</strong>: hoàn 50%, Freelancer nhận 50%.
          </li>
          <li>
            <strong>Hủy ngang / không chính đáng</strong>: phí phạt 10–25% + thanh toán phần việc
            đã làm; phần còn lại hoàn về ví VLC.
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="refund-policy-card refund-policy-card--fl">
      <h3 className="refund-policy-card__title">Yêu cầu hoàn tiền từ Khách hàng</h3>
      <ul className="refund-policy-card__list">
        <li>
          Bạn có <strong>3 ngày</strong> để đồng ý hoặc phản đối. Không phản hồi → hệ thống tự xử
          lý theo chính sách.
        </li>
        <li>
          Nếu đồng ý, số tiền được <strong>chia theo mức chính đáng</strong> (50/50 ở GĐ3, hoặc phí
          phạt + công việc đã làm nếu hủy ngang).
        </li>
        <li>Hoa hồng nền tảng (~10%) áp dụng khi giải ngân cho bạn, không trừ khỏi mức 50/50 hiển thị.</li>
      </ul>
    </div>
  );
}

export default function RefundRequestsPanel({ audience = "client" }: RefundRequestsPanelProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const [rows, setRows] = useState<RefundRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await listRefundRequests();
      setRows(all.filter((r) => r.viewer_role === audience));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải yêu cầu hoàn tiền.";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    void load();
  }, [load]);

  const ordersListHref = useMemo(
    () => (audience === "freelancer" ? "/dich-vu/don-hang" : "/hire/orders"),
    [audience],
  );

  async function handleRespond(contractId: string, agree: boolean) {
    setBusyId(contractId);
    setActionError("");
    try {
      await patchContractWorkflow(contractId, {
        action: "respond_cancel_request",
        agree,
        responseNote: agree ? "Đồng ý hủy" : "Phản đối — chuyển tranh chấp",
      });
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi phản hồi.";
      setActionError(message);
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return <p className="manage-page__state">Đang tải yêu cầu hoàn tiền...</p>;
  }

  if (error) {
    return (
      <p className="hire-page__state hire-page__state--error" role="alert">
        {error}
      </p>
    );
  }

  return (
    <>
      <RefundPolicyCard audience={audience} />

      {actionError ? (
        <p className="hire-page__state hire-page__state--error" role="alert">
          {actionError}
        </p>
      ) : null}

      {!rows.length ? (
        <div className="manage-page__empty manage-page__empty--compact">
          <h2 className="manage-page__empty-title">Chưa có yêu cầu hoàn tiền</h2>
          <p className="manage-page__empty-text">
            {audience === "freelancer"
              ? "Khi khách hàng yêu cầu hủy & hoàn tiền trên đơn của bạn, thông tin phân bổ sẽ hiển thị tại đây."
              : "Gửi yêu cầu từ workspace đơn hàng (Giai đoạn 3) hoặc theo dõi trạng thái tại đây."}
          </p>
          <Link href={ordersListHref} className="manage-page__empty-link">
            {audience === "freelancer" ? "Xem đơn hàng dịch vụ" : "Xem đơn dịch vụ"}
          </Link>
        </div>
      ) : (
        <ul className="resolution-list">
          {rows.map((row) => {
            const failed = String(row.status).toLowerCase() === "rejected";
            const progressIdx = refundProgressIndex(row.status, row.escrow_status);
            const href = orderHref(row.contract_id, audience);
            const isPending = String(row.status).toLowerCase() === "pending";
            const isBusy = busyId === row.contract_id;
            const hasStoredSettlement = row.client_refund_amount != null;

            return (
              <li key={row.id} className="resolution-card">
                <div className="resolution-card__head">
                  <div>
                    <h3 className="resolution-card__title">
                      <Link href={href}>{orderTitle(row)}</Link>
                    </h3>
                    <p className="resolution-card__meta">
                      {formatDateUi(row.created_at)} · {row.counterparty_name || "—"} ·{" "}
                      {formatVndUi(row.agreed_price)}
                    </p>
                    {row.legitimacy ? (
                      <p className="resolution-card__meta resolution-card__meta--legitimacy">
                        Phân loại: {legitimacyLabel(row.legitimacy as "legitimate" | "unjustified" | "needs_review")}
                      </p>
                    ) : null}
                  </div>
                  <span className={`resolution-card__status resolution-card__status--${row.status}`}>
                    {statusLabel(row.status, audience)}
                  </span>
                </div>

                <ResolutionProgressBar
                  steps={REFUND_PROGRESS_STEPS}
                  activeIndex={progressIdx}
                  failed={failed}
                  failedLabel="Yêu cầu bị từ chối"
                />

                <dl className="resolution-card__details">
                  <div>
                    <dt>Lý do từ khách hàng</dt>
                    <dd>
                      {row.reason_code ? refundReasonLabel(row.reason_code) : row.reason}
                      {row.detail ? ` — ${row.detail}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Nhận lại</dt>
                    <dd>Ví VLC</dd>
                  </div>
                  {isPending ? (
                    <div>
                      <dt>{audience === "freelancer" ? "Hạn phản hồi của bạn" : "Hạn phản hồi FL"}</dt>
                      <dd>
                        {formatDateUi(row.respond_by_at)}
                        {audience === "freelancer" ? (
                          <> · còn {formatDeadlineCountdown(row.respond_by_at) || "—"}</>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                  {row.freelancer_response ? (
                    <div>
                      <dt>Phản hồi freelancer</dt>
                      <dd>{row.freelancer_response}</dd>
                    </div>
                  ) : null}
                </dl>

                <RefundSettlementBreakdown
                  agreedPrice={row.agreed_price}
                  workflowStage={row.workflow_stage_at_request || row.workflow_stage}
                  hasProgress={row.had_progress_at_request ?? false}
                  reasonCode={row.reason_code}
                  legitimacy={row.legitimacy}
                  splitType={row.split_type}
                  penaltyPercent={row.penalty_percent}
                  clientAmount={hasStoredSettlement ? row.client_refund_amount : undefined}
                  freelancerAmount={hasStoredSettlement ? row.freelancer_amount : undefined}
                  platformFeeAmount={row.platform_fee_amount}
                  audience={audience}
                  compact
                />

                {audience === "freelancer" && isPending ? (
                  <div className="resolution-card__actions">
                    <button
                      type="button"
                      className="resolution-form__btn"
                      disabled={isBusy}
                      onClick={() => void handleRespond(row.contract_id, true)}
                    >
                      {isBusy ? "Đang xử lý..." : "Đồng ý hủy (theo phân bổ)"}
                    </button>
                    <button
                      type="button"
                      className="resolution-form__btn resolution-form__btn--outline"
                      disabled={isBusy}
                      onClick={() => void handleRespond(row.contract_id, false)}
                    >
                      Từ chối → Tranh chấp
                    </button>
                  </div>
                ) : null}

                <Link href={href} className="resolution-card__link">
                  Mở workspace đơn hàng
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
