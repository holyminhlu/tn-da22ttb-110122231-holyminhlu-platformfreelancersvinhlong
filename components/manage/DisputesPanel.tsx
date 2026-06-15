"use client";

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
import ResolutionProgressBar from "@/components/orders/ResolutionProgressBar";
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
}: DisputesPanelProps) {
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
      <ul className="resolution-list resolution-list--compact">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className={`resolution-card resolution-card--selectable${row.id === selected?.id ? " resolution-card--active" : ""}`}
              onClick={() => setSelectedId(row.id)}
            >
              <h3 className="resolution-card__title">{orderTitle(row)}</h3>
              <p className="resolution-card__meta">
                {disputeIssueLabel(row.issue_category)} · {formatDate(row.created_at)}
              </p>
              <span className={`resolution-card__status resolution-card__status--${row.status}`}>
                {row.status === "open" ? "Đang mở" : "Đã đóng"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="resolution-disputes-detail">
        {selected ? (
          <>
            <div className="resolution-card resolution-card--flat">
              <h3 className="resolution-card__title">{orderTitle(selected)}</h3>
              <p className="resolution-card__meta">
                {audience === "freelancer" ? "Client" : "Freelancer"}:{" "}
                {selected.counterparty_name} · {formatVnd(selected.agreed_price)}
              </p>
              <ResolutionProgressBar
                steps={DISPUTE_PROGRESS_STEPS}
                activeIndex={disputeProgressIndex(selected.dispute_stage, selected.status)}
              />
              <dl className="resolution-card__details">
                <div>
                  <dt>Vấn đề</dt>
                  <dd>{disputeIssueLabel(selected.issue_category)}</dd>
                </div>
                <div>
                  <dt>Yêu cầu từ {audience === "freelancer" ? "client" : "bạn"}</dt>
                  <dd>{disputeResolutionLabel(selected.desired_resolution)}</dd>
                </div>
              </dl>
              <p className="resolution-card__meta resolution-card__meta--note">
                Workflow đơn tạm dừng trong lúc tranh chấp. Xem tóm tắt đơn hoặc tiếp tục trao đổi bên
                dưới.
              </p>
              <Link
                href={orderHref(selected.contract_id, audience)}
                className="resolution-card__link"
              >
                Xem đơn hàng (workflow tạm dừng)
              </Link>
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
