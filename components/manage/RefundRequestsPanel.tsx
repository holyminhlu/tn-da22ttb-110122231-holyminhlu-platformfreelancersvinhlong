"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { patchContractWorkflow } from "@/lib/api/contracts";
import { listRefundRequests, type RefundRequestRow } from "@/lib/api/resolution";
import { formatDate, formatVnd } from "@/lib/format";
import { formatDeadlineCountdown } from "@/lib/orders/workflowSlaDisplay";
import {
  REFUND_PROGRESS_STEPS,
  refundProgressIndex,
  refundReasonLabel,
  refundMethodLabel,
} from "@/lib/orders/refundDisputeData";
import ResolutionProgressBar from "@/components/orders/ResolutionProgressBar";

export type ResolutionAudience = "client" | "freelancer";

type RefundRequestsPanelProps = {
  audience?: ResolutionAudience;
};

function orderTitle(row: RefundRequestRow) {
  return row.job_title || row.service_title || "Đơn hàng";
}

function orderHref(contractId: string, audience: ResolutionAudience) {
  return audience === "freelancer"
    ? `/findwork/orders/${contractId}`
    : `/hire/orders/${contractId}`;
}

function statusLabel(status: string, audience: ResolutionAudience) {
  const s = String(status).toLowerCase();
  if (s === "pending") {
    return audience === "freelancer" ? "Chờ bạn phản hồi" : "Đang chờ phản hồi";
  }
  if (s === "approved") return "Đã đồng ý hoàn tiền";
  if (s === "auto_approved") return "Tự động hoàn tiền";
  if (s === "rejected") return "Bị từ chối";
  return status;
}

export default function RefundRequestsPanel({ audience = "client" }: RefundRequestsPanelProps) {
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
        responseNote: agree ? "Đồng ý hủy" : "Phản đối — tiếp tục thực hiện",
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

  if (!rows.length) {
    return (
      <div className="manage-page__empty manage-page__empty--compact">
        <h2 className="manage-page__empty-title">Chưa có yêu cầu hoàn tiền</h2>
        <p className="manage-page__empty-text">
          {audience === "freelancer"
            ? "Khi client yêu cầu hủy & hoàn tiền trên đơn của bạn, thông tin sẽ hiển thị tại đây để bạn phản hồi."
            : "Khi bạn gửi yêu cầu từ workspace đơn hàng, trạng thái xử lý sẽ hiển thị tại đây."}
        </p>
        <Link href={ordersListHref} className="manage-page__empty-link">
          {audience === "freelancer" ? "Xem đơn hàng dịch vụ" : "Xem đơn dịch vụ"}
        </Link>
      </div>
    );
  }

  return (
    <>
      {actionError ? (
        <p className="hire-page__state hire-page__state--error" role="alert">
          {actionError}
        </p>
      ) : null}
      <ul className="resolution-list">
        {rows.map((row) => {
          const failed = String(row.status).toLowerCase() === "rejected";
          const progressIdx = refundProgressIndex(row.status, row.escrow_status);
          const href = orderHref(row.contract_id, audience);
          const isPending = String(row.status).toLowerCase() === "pending";
          const isBusy = busyId === row.contract_id;

          return (
            <li key={row.id} className="resolution-card">
              <div className="resolution-card__head">
                <div>
                  <h3 className="resolution-card__title">
                    <Link href={href}>{orderTitle(row)}</Link>
                  </h3>
                  <p className="resolution-card__meta">
                    {formatDate(row.created_at)} · {row.counterparty_name || "—"} ·{" "}
                    {formatVnd(row.agreed_price)}
                  </p>
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
                  <dt>Lý do từ client</dt>
                  <dd>
                    {row.reason_code ? refundReasonLabel(row.reason_code) : row.reason}
                    {row.detail ? ` — ${row.detail}` : ""}
                  </dd>
                </div>
                {audience === "client" ? (
                  <div>
                    <dt>Hoàn về</dt>
                    <dd>{refundMethodLabel(row.refund_method)}</dd>
                  </div>
                ) : null}
                {isPending ? (
                  <div>
                    <dt>{audience === "freelancer" ? "Hạn phản hồi của bạn" : "Hạn phản hồi FL"}</dt>
                    <dd>
                      {formatDate(row.respond_by_at)}
                      {audience === "freelancer" ? (
                        <>
                          {" "}
                          · còn {formatDeadlineCountdown(row.respond_by_at) || "—"}
                        </>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                {row.freelancer_response ? (
                  <div>
                    <dt>Phản hồi của bạn</dt>
                    <dd>{row.freelancer_response}</dd>
                  </div>
                ) : null}
              </dl>

              {audience === "freelancer" && isPending ? (
                <div className="resolution-card__actions">
                  <button
                    type="button"
                    className="resolution-form__btn"
                    disabled={isBusy}
                    onClick={() => void handleRespond(row.contract_id, true)}
                  >
                    {isBusy ? "Đang xử lý..." : "Đồng ý hủy"}
                  </button>
                  <button
                    type="button"
                    className="resolution-form__btn resolution-form__btn--outline"
                    disabled={isBusy}
                    onClick={() => void handleRespond(row.contract_id, false)}
                  >
                    Phản đối
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
    </>
  );
}
