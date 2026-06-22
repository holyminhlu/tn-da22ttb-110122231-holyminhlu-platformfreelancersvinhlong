"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
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
import AdminDisputeResolvePanel from "./AdminDisputeResolvePanel";
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

function fileNameFromUrl(url: string) {
  return decodeURIComponent(url.split("/").pop() || "minh-chung");
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
}

function parseEvidenceUrls(evidence: unknown): string[] {
  if (!evidence || typeof evidence !== "object") return [];
  const files = (evidence as { files?: unknown }).files;
  if (!Array.isArray(files)) return [];
  return files.map((u) => String(u)).filter(Boolean);
}

export default function AdminDisputesPage() {  const { t, formatVnd, formatDate } = useTranslation();
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
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [resolveError, setResolveError] = useState("");
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
    setResolveError("");
    try {
      setDetail(await getAdminDisputeDetail(disputeId));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết.";
      setResolveError(message);
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

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

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

  async function handleResolve(
    resolution: AdminResolveDisputeAction,
    payload: { adminNote?: string; clientAmount?: number; freelancerAmount?: number },
  ) {
    if (!selectedId || !detail) return;
    const label = adminResolveActionLabel(resolution);
    if (!window.confirm(`${t("Xác nhận quyết định: ")}${label}?`)) return;

    if (resolution === "split") {
      const total = Number(detail.dispute.agreed_price) || 0;
      const clientAmount = Number(payload.clientAmount);
      const freelancerAmount = Number(payload.freelancerAmount);
      if (
        !Number.isFinite(clientAmount) ||
        !Number.isFinite(freelancerAmount) ||
        Math.round(clientAmount + freelancerAmount) !== Math.round(total)
      ) {
        setResolveError(`${t("Tổng chia phải bằng ")}${formatVndUi(total)}.`);
        return;
      }
    }

    setResolveBusy(true);
    setResolveError("");
    try {
      const result = await resolveAdminDispute(selectedId, {
        resolution,
        adminNote: payload.adminNote,
        ...(resolution === "split"
          ? { clientAmount: payload.clientAmount, freelancerAmount: payload.freelancerAmount }
          : {}),
      });
      setToast({ type: "ok", message: result.message });
      await load();
      await loadDetail(selectedId);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xử lý tranh chấp.";
      setResolveError(message);
    } finally {
      setResolveBusy(false);
    }
  }

  const caseEvidenceUrls = detail ? parseEvidenceUrls(detail.dispute.evidence) : [];
  const isCancelRejectedDispute = selected?.issue_category === "cancel_rejected";

  return (
    <div className="admin-page admin-disputes-page">
      <header className="admin-page__head admin-disputes-page__head">
        <h1 className="admin-page__title">{t("Quản lý tranh chấp")}</h1>
      </header>

      {toast ? (
        <p
          className={`admin-toast admin-toast--${toast.type === "ok" ? "ok" : "err"}`}
          role="status"
        >
          {t(toast.message)}
        </p>
      ) : null}

      <div className="admin-disputes-toolbar" aria-label={t("Bộ lọc tranh chấp")}>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-disputes-toolbar__refresh"
          onClick={() => void load()}
        >
          <FaRedo aria-hidden /> {t("Làm mới")}
        </button>

        <div className="admin-tabs admin-tabs--inline" role="tablist" aria-label={t("Trạng thái")}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusTab === tab.id}
              className={`admin-tab${statusTab === tab.id ? " admin-tab--active" : ""}`}
              onClick={() => setStatusTab(tab.id)}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        <label className="admin-disputes-toolbar__field">
          <span className="admin-filters__label">{t("Giai đoạn")}</span>
          <select
            className="admin-filters__select admin-disputes-toolbar__select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as AdminDisputeStageFilter)}
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-disputes-toolbar__field admin-disputes-toolbar__field--search">
          <span className="admin-filters__label">{t("Tìm kiếm")}</span>
          <div className="admin-filters__search-wrap">
            <FaSearch className="admin-filters__search-icon" aria-hidden />
            <input
              type="search"
              className="admin-filters__input"
              placeholder={t("Đơn, khách hàng, freelancer...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label={t("Tìm theo đơn, khách hàng, freelancer")}
            />
          </div>
        </label>

        <p className="admin-disputes-toolbar__count" aria-live="polite">
          {loading ? "Đang tải..." : `${total} tranh chấp`}
        </p>
      </div>

      {loading ? (
        <p className="admin-page__state admin-disputes-page__state">{t("Đang tải danh sách tranh chấp...")}</p>
      ) : !rows.length ? (
        <div className="admin-empty admin-disputes-page__state">
          <p>{t("Không có tranh chấp phù hợp bộ lọc.")}</p>
        </div>
      ) : (
        <div className="admin-disputes-split">
          <aside className="admin-disputes-list" aria-label={t("Danh sách tranh chấp")}>
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
                      {disputeIssueLabel(row.issue_category)} · {formatDateUi(row.created_at)}
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
                    Khách hàng: <strong>{selected.client_name}</strong> · Freelancer:{" "}
                    <strong>{selected.freelancer_name}</strong> · {formatVndUi(selected.agreed_price)}
                  </p>
                  <p className="resolution-card__meta">
                    Ký quỹ: {selected.escrow_status || "—"} · Giai đoạn đơn:{" "}
                    {selected.workflow_stage || "—"}
                  </p>
                  <ResolutionProgressBar
                    steps={DISPUTE_PROGRESS_STEPS}
                    activeIndex={disputeProgressIndex(selected.dispute_stage, selected.status)}
                  />

                  <section className="admin-dispute-case" aria-label={t("Tóm tắt tranh chấp")}>
                    <div className="dispute-highlights admin-dispute-case__highlights">
                      <div className="dispute-highlight dispute-highlight--issue">
                        <span className="dispute-highlight__label">{t("Vấn đề")}</span>
                        <span className="dispute-highlight__value">
                          {disputeIssueLabel(selected.issue_category)}
                        </span>
                      </div>
                      <div className="dispute-highlight dispute-highlight--request">
                        <span className="dispute-highlight__label">{t("Yêu cầu xử lý")}</span>
                        <span className="dispute-highlight__value">
                          {disputeResolutionLabel(selected.desired_resolution)}
                        </span>
                      </div>
                    </div>

                    <div className="admin-dispute-case__block admin-dispute-case__block--desc">
                      <span className="admin-dispute-case__label">{t("Mô tả")}</span>
                      <p className="admin-dispute-case__text">
                        {selected.reason?.trim() || "—"}
                      </p>
                    </div>

                    {selected.admin_notes ? (
                      <div className="admin-dispute-case__block admin-dispute-case__block--note">
                        <span className="admin-dispute-case__label">{t("Ghi chú admin")}</span>
                        <p className="admin-dispute-case__text">{selected.admin_notes}</p>
                      </div>
                    ) : null}

                    {caseEvidenceUrls.length > 0 ? (
                      <div className="admin-dispute-case__block admin-dispute-case__block--evidence">
                        <span className="admin-dispute-case__label">{t("Minh chứng")}</span>
                        <ul className="admin-dispute-case__evidence-grid">
                          {caseEvidenceUrls.map((url) => {
                            const href = resolveAvatarSrc(url) || url;
                            const name = fileNameFromUrl(url);
                            return (
                              <li key={url} className="admin-dispute-case__evidence-item">
                                {isImageUrl(url) ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={name}
                                    className="admin-dispute-case__evidence-image"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={href}
                                      alt={name}
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="admin-dispute-case__evidence-file"
                                  >
                                    {name}
                                  </a>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </section>
                </div>

                {selected.status === "open" ? (
                  <AdminDisputeResolvePanel
                    key={selected.id}
                    agreedPrice={selected.agreed_price}
                    escrowStatus={selected.escrow_status}
                    isCancelRejectedDispute={isCancelRejectedDispute}
                    busy={resolveBusy}
                    error={resolveError}
                    onResolve={handleResolve}
                  />
                ) : null}

                {detailLoading ? (
                  <p className="admin-page__state">{t("Đang tải trao đổi...")}</p>
                ) : detail ? (
                  <div className="admin-disputes-chat">
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
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
