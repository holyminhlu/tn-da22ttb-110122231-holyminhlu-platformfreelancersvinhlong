"use client";

import { formatDateUi, formatVndUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDisputeDetail,
  listDisputes,
  postDisputeMessage,
  type DisputeListRow,
} from "@/lib/api/resolution";
import { formatDate, formatVnd } from "@/lib/format";
import {
  DISPUTE_PROGRESS_STEPS,
  disputeIssueLabel,
  disputeProgressIndex,
  disputeResolutionLabel,
} from "@/lib/orders/refundDisputeData";
import DisputeProgressSteps from "@/components/manage/DisputeProgressSteps";
import ResolutionCenterThread from "@/components/orders/ResolutionCenterThread";
import type { ResolutionAudience } from "./RefundRequestsPanel";

type DisputesPanelProps = {
  audience?: ResolutionAudience;
  initialDisputeId?: string | null;
  initialContractId?: string | null;
};

function orderTitle(row: DisputeListRow) {
  return row.job_title || row.service_title || "Đơn hàng";
}

function orderHref(contractId: string, audience: ResolutionAudience) {
  return audience === "freelancer"
    ? `/findwork/orders/${contractId}`
    : `/hire/orders/${contractId}`;
}

export default function DisputesPanel({
  audience = "client",
  initialDisputeId = null,
  initialContractId = null,
}: DisputesPanelProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const [rows, setRows] = useState<DisputeListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getDisputeDetail>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listDisputes();
      setRows(list.filter((r) => r.viewer_role === audience));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải tranh chấp.";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  const loadDetail = useCallback(async (disputeId: string) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      setDetail(await getDisputeDetail(disputeId));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết tranh chấp.";
      setDetailError(message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!rows.length) return;

    if (initialDisputeId) {
      const byDispute = rows.find((r) => r.id === initialDisputeId);
      if (byDispute) {
        setSelectedId(byDispute.id);
        return;
      }
    }

    if (initialContractId) {
      const byContract = rows.find((r) => r.contract_id === initialContractId);
      if (byContract) {
        setSelectedId(byContract.id);
        return;
      }
    }
  }, [rows, initialDisputeId, initialContractId]);

  useEffect(() => {
    if (rows.length && !selectedId) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const ordersListHref = useMemo(
    () => (audience === "freelancer" ? "/dich-vu/don-hang" : "/hire/orders"),
    [audience],
  );

  async function handleSendMessage(body: string) {
  const formatDate = formatDateUi;
  const formatVnd = formatVndUi;
    if (!selectedId) return;
    setBusy(true);
    setActionError("");
    try {
      await postDisputeMessage(selectedId, body);
      await loadDetail(selectedId);
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi tin nhắn.";
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="manage-page__state">Đang tải tranh chấp...</p>;
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
        <h2 className="manage-page__empty-title">Chưa có tranh chấp</h2>
        <p className="manage-page__empty-text">
          {audience === "freelancer"
            ? "Khi client (hoặc bạn) mở tranh chấp trên đơn dịch vụ, bạn có thể theo dõi và trao đổi tại đây."
            : "Mở tranh chấp từ workspace đơn hàng khi có sự cố nghiêm trọng cần Admin can thiệp."}
        </p>
        <Link href={ordersListHref} className="manage-page__empty-link">
          {audience === "freelancer" ? "Xem đơn hàng dịch vụ" : "Xem đơn dịch vụ"}
        </Link>
      </div>
    );
  }

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  return (
    <div className="resolution-disputes-layout">
      <aside className="resolution-disputes-sidebar" aria-label="Danh sách tranh chấp">
        <ul className="resolution-list resolution-list--compact">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`resolution-card resolution-card--selectable${row.id === selected?.id ? " resolution-card--active" : ""}`}
                onClick={() => setSelectedId(row.id)}
              >
                <div className="resolution-card__row">
                  <h3 className="resolution-card__title">{orderTitle(row)}</h3>
                  <span className={`resolution-card__status resolution-card__status--${row.status}`}>
                    {row.status === "open" ? "Mở" : "Đóng"}
                  </span>
                </div>
                <p className="resolution-card__meta">
                  {disputeIssueLabel(row.issue_category)} · {formatDateUi(row.created_at)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="resolution-disputes-detail">
        {selected ? (
          <>
            <div className="resolution-card resolution-card--flat">
              <h3 className="resolution-card__title">{orderTitle(selected)}</h3>
              <p className="resolution-card__meta">
                {audience === "freelancer" ? "Client" : "Freelancer"}:{" "}
                {selected.counterparty_name} · {formatVndUi(selected.agreed_price)}
              </p>
              <DisputeProgressSteps
                steps={DISPUTE_PROGRESS_STEPS}
                activeIndex={disputeProgressIndex(selected.dispute_stage, selected.status)}
              />
              <div className="dispute-highlights">
                <div className="dispute-highlight dispute-highlight--issue">
                  <span className="dispute-highlight__label">Vấn đề</span>
                  <span className="dispute-highlight__value">
                    {disputeIssueLabel(selected.issue_category)}
                  </span>
                </div>
                <div className="dispute-highlight dispute-highlight--request">
                  <span className="dispute-highlight__label">
                    {audience === "freelancer" ? "Yêu cầu từ client" : "Yêu cầu của bạn"}
                  </span>
                  <span className="dispute-highlight__value">
                    {disputeResolutionLabel(selected.desired_resolution)}
                  </span>
                </div>
                <Link
                  href={orderHref(selected.contract_id, audience)}
                  className="dispute-highlight dispute-highlight--action"
                >
                  <span className="dispute-highlight__label">Đơn hàng</span>
                  <span className="dispute-highlight__value dispute-highlight__value--link">
                    Xem đơn hàng
                    <span className="dispute-highlight__arrow" aria-hidden>
                      →
                    </span>
                  </span>
                </Link>
              </div>
              <p className="resolution-card__meta resolution-card__meta--note">
                Workflow đơn tạm dừng trong lúc tranh chấp. Tiếp tục trao đổi bên dưới.
              </p>
            </div>

            {detailLoading ? (
              <p className="manage-page__state">Đang tải trao đổi...</p>
            ) : detailError ? (
              <p className="hire-page__state hire-page__state--error" role="alert">
                {detailError}
              </p>
            ) : detail ? (
              <>
                {actionError ? (
                  <p className="hire-page__state hire-page__state--error" role="alert">
                    {actionError}
                  </p>
                ) : null}
                <ResolutionCenterThread
                  messages={detail.messages}
                  respondByAt={detail.dispute.respond_by_at}
                  disputeOpen={detail.dispute.status === "open"}
                  viewerRole={detail.role}
                  busy={busy}
                  onSend={(body) => void handleSendMessage(body)}
                />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
