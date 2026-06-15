"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaRedo, FaSearch } from "react-icons/fa";
import {
  getAdminDisputeDetail,
  listAdminDisputes,
  postAdminDisputeMessage,
  resolveAdminDispute,
  type AdminDisputeRow,
  type AdminDisputeStageFilter,
  type AdminDisputeStatusFilter,
  type AdminResolveDisputeAction,
} from "@/lib/api/admin";
import { formatDate, formatVnd } from "@/lib/format";
import {
  adminResolveActionLabel,
  DISPUTE_PROGRESS_STEPS,
  disputeIssueLabel,
  disputeProgressIndex,
  disputeResolutionLabel,
  disputeStageLabel,
} from "@/lib/orders/refundDisputeData";
import ResolutionProgressBar from "@/components/orders/ResolutionProgressBar";
import ResolutionCenterThread from "@/components/orders/ResolutionCenterThread";
import { resolveAvatarSrc } from "@/lib/authSession";
import "../manage/manage.css";
import "./admin.css";

const STATUS_TABS: { id: AdminDisputeStatusFilter; label: string }[] = [
  { id: "open", label: "Đang mở" },
  { id: "resolved", label: "Đã xử lý" },
  { id: "all", label: "Tất cả" },
];

const STAGE_OPTIONS: { id: AdminDisputeStageFilter; label: string }[] = [
  { id: "all", label: "Mọi giai đoạn" },
  { id: "admin_review", label: "Chờ admin xem xét" },
  { id: "awaiting_response", label: "Chờ phản hồi" },
  { id: "initiated", label: "Mới mở" },
];

function orderTitle(row: AdminDisputeRow) {
  return row.job_title || row.service_title || "Đơn hàng";
}

function parseEvidenceUrls(evidence: unknown): string[] {
  if (!evidence || typeof evidence !== "object") return [];
  const files = (evidence as { files?: unknown }).files;
  if (!Array.isArray(files)) return [];
  return files.map((u) => String(u)).filter(Boolean);
}

export default function AdminDisputesPage() {
  const searchParams = useSearchParams();
  const initialDisputeId = searchParams.get("dispute");

  const [statusTab, setStatusTab] = useState<AdminDisputeStatusFilter>("open");
  const [stageFilter, setStageFilter] = useState<AdminDisputeStageFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<AdminDisputeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getAdminDisputeDetail>> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const data = await listAdminDisputes({
        status: statusTab,
        stage: stageFilter,
        q: searchQuery,
      });
      setRows(data.disputes ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải tranh chấp.";
      setToast({ type: "err", message });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusTab, stageFilter, searchQuery]);

  const loadDetail = useCallback(async (disputeId: string) => {
    setDetailLoading(true);
    setActionError("");
    try {
      setDetail(await getAdminDisputeDetail(disputeId));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết.";
      setActionError(message);
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
      const match = rows.find((r) => r.id === initialDisputeId);
      if (match) {
        setSelectedId(match.id);
        return;
      }
    }
    if (!selectedId) setSelectedId(rows[0].id);
  }, [rows, initialDisputeId, selectedId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleSendMessage(body: string) {
    if (!selectedId) return;
    setBusy(true);
    setActionError("");
    try {
      await postAdminDisputeMessage(selectedId, body);
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

  async function handleResolve(resolution: AdminResolveDisputeAction) {
    if (!selectedId || !detail) return;
    const label = adminResolveActionLabel(resolution);
    if (!window.confirm(`Xác nhận quyết định: ${label}?`)) return;

    setResolveBusy(true);
    setActionError("");
    try {
      const result = await resolveAdminDispute(selectedId, {
        resolution,
        adminNote: adminNote.trim() || undefined,
      });
      setToast({ type: "ok", message: result.message });
      setAdminNote("");
      await load();
      await loadDetail(selectedId);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xử lý tranh chấp.";
      setActionError(message);
    } finally {
      setResolveBusy(false);
    }
  }

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
  const evidenceUrls = detail
    ? [
        ...new Set([
          ...parseEvidenceUrls(detail.dispute.evidence),
          ...detail.messages.flatMap((m) =>
            Array.isArray(m.attachments) ? m.attachments.map((u) => String(u)) : [],
          ),
        ]),
      ]
    : [];

  return (
    <div className="admin-page admin-disputes-page">
      <header className="admin-page__head admin-disputes-page__head">
        <h1 className="admin-page__title">Quản lý tranh chấp</h1>
      </header>

      {toast ? (
        <p
          className={`admin-toast admin-toast--${toast.type === "ok" ? "ok" : "err"}`}
          role="status"
        >
          {toast.message}
        </p>
      ) : null}

      <div className="admin-disputes-toolbar" aria-label="Bộ lọc tranh chấp">
        <p className="admin-disputes-toolbar__lead">
          Xem xét tranh chấp giữa client và freelancer, trao đổi trong Trung tâm giải quyết và đưa
          ra quyết định cuối cùng.
        </p>

        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-disputes-toolbar__refresh"
          onClick={() => void load()}
        >
          <FaRedo aria-hidden /> Làm mới
        </button>

        <div className="admin-tabs admin-tabs--inline" role="tablist" aria-label="Trạng thái">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusTab === tab.id}
              className={`admin-tab${statusTab === tab.id ? " admin-tab--active" : ""}`}
              onClick={() => setStatusTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="admin-disputes-toolbar__stage">
          <span className="admin-filters__label">Giai đoạn</span>
          <select
            className="admin-filters__select admin-disputes-toolbar__select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as AdminDisputeStageFilter)}
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-disputes-toolbar__search">
          <span className="admin-filters__label">Tìm kiếm</span>
          <div className="admin-filters__search-wrap">
            <FaSearch className="admin-filters__search-icon" aria-hidden />
            <input
              type="search"
              className="admin-filters__input"
              placeholder="Đơn, client, freelancer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Tìm theo đơn, client, freelancer"
            />
          </div>
        </label>

        <p className="admin-disputes-toolbar__count" aria-live="polite">
          {loading ? "Đang tải..." : `${total} tranh chấp`}
        </p>
      </div>

      {loading ? (
        <p className="admin-page__state admin-disputes-page__state">Đang tải danh sách tranh chấp...</p>
      ) : !rows.length ? (
        <div className="admin-empty admin-disputes-page__state">
          <p>Không có tranh chấp phù hợp bộ lọc.</p>
        </div>
      ) : (
        <div className="admin-disputes-split">
          <aside className="admin-disputes-list" aria-label="Danh sách tranh chấp">
            <ul className="resolution-list resolution-list--compact admin-disputes-list__inner">
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
                    <p className="resolution-card__meta">
                      {row.client_name} ↔ {row.freelancer_name}
                    </p>
                    <span
                      className={`resolution-card__status resolution-card__status--${row.status === "open" ? "open" : "resolved"}`}
                    >
                      {row.status === "open"
                        ? disputeStageLabel(row.dispute_stage)
                        : adminResolveActionLabel(row.resolution)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="admin-disputes-detail">
            {selected ? (
              <>
                <div className="resolution-card resolution-card--flat">
                  <h3 className="resolution-card__title">{orderTitle(selected)}</h3>
                  <p className="resolution-card__meta">
                    Client: <strong>{selected.client_name}</strong> · Freelancer:{" "}
                    <strong>{selected.freelancer_name}</strong> · {formatVnd(selected.agreed_price)}
                  </p>
                  <p className="resolution-card__meta">
                    Ký quỹ: {selected.escrow_status || "—"} · Giai đoạn đơn:{" "}
                    {selected.workflow_stage || "—"}
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
                      <dt>Yêu cầu xử lý</dt>
                      <dd>{disputeResolutionLabel(selected.desired_resolution)}</dd>
                    </div>
                    <div>
                      <dt>Mô tả</dt>
                      <dd>{selected.reason}</dd>
                    </div>
                    {selected.admin_notes ? (
                      <div>
                        <dt>Ghi chú admin</dt>
                        <dd>{selected.admin_notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {evidenceUrls.length > 0 ? (
                    <div className="admin-disputes-evidence">
                      <p className="admin-disputes-evidence__label">Minh chứng</p>
                      <ul className="admin-disputes-evidence__list">
                        {evidenceUrls.map((url) => {
                          const href = resolveAvatarSrc(url) || url;
                          return (
                            <li key={url}>
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                {url.split("/").pop()}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {selected.status === "open" ? (
                  <div className="admin-resolve-panel">
                    <h4 className="admin-resolve-panel__title">Quyết định của Admin</h4>
                    <p className="admin-resolve-panel__hint">
                      Chọn một trong các phương án xử lý. Hành động không thể hoàn tác.
                    </p>
                    <label className="admin-field">
                      <span className="admin-field__label">Ghi chú (tùy chọn)</span>
                      <textarea
                        className="admin-textarea"
                        rows={3}
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Lý do quyết định, hướng dẫn cho các bên..."
                      />
                    </label>
                    <div className="admin-resolve-panel__actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        disabled={resolveBusy}
                        onClick={() => void handleResolve("full_refund")}
                      >
                        Hoàn tiền client
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        disabled={resolveBusy}
                        onClick={() => void handleResolve("release")}
                      >
                        Giải ngân freelancer
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={resolveBusy}
                        onClick={() => void handleResolve("dismiss")}
                      >
                        Bác tranh chấp
                      </button>
                    </div>
                  </div>
                ) : null}

                {detailLoading ? (
                  <p className="admin-page__state">Đang tải trao đổi...</p>
                ) : detail ? (
                  <>
                    {actionError ? (
                      <p className="admin-toast admin-toast--err" role="alert">
                        {actionError}
                      </p>
                    ) : null}
                    <ResolutionCenterThread
                      messages={detail.messages}
                      respondByAt={detail.dispute.respond_by_at}
                      disputeOpen={detail.dispute.status === "open"}
                      viewerRole="admin"
                      busy={busy}
                      onSend={(body) => void handleSendMessage(body)}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
