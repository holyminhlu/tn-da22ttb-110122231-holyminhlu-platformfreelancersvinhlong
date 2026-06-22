"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaRedo, FaSearch } from "react-icons/fa";
import {
  getAdminRefundDetail,
  listAdminRefunds,
  resolveAdminRefund,
  type AdminRefundRow,
  type AdminRefundStatusFilter,
} from "@/lib/api/admin";
import { formatDeadlineCountdown } from "@/lib/orders/workflowSlaDisplay";
import {
  REFUND_PROGRESS_STEPS,
  adminRefundRequestStatusLabel,
  refundProgressIndex,
  refundReasonLabel,
} from "@/lib/orders/refundDisputeData";
import { computeRefundSettlement, legitimacyLabel } from "@/lib/orders/refundSettlement";
import ResolutionProgressBar from "@/components/orders/ResolutionProgressBar";
import RefundSettlementBreakdown from "@/components/orders/RefundSettlementBreakdown";
import "../manage/manage.css";
import "./admin.css";

const STATUS_TABS: { id: AdminRefundStatusFilter; label: string }[] = [
  { id: "pending", label: "Đang chờ" },
  { id: "resolved", label: "Đã xử lý" },
  { id: "all", label: "Tất cả" },
];

function orderTitle(row: AdminRefundRow) {
  return row.job_title || row.service_title || "Đơn hàng";
}

function isOverdue(row: AdminRefundRow) {
  if (String(row.status).toLowerCase() !== "pending") return false;
  return new Date(row.respond_by_at).getTime() < Date.now();
}

export default function AdminRefundsPage() {  const { t, formatVnd, formatDate } = useTranslation();
  const searchParams = useSearchParams();
  const initialRequestId = searchParams.get("request");

  const [statusTab, setStatusTab] = useState<AdminRefundStatusFilter>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<AdminRefundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getAdminRefundDetail>> | null>(
    null,
  );
  const [resolveBusy, setResolveBusy] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [legitimacyChoice, setLegitimacyChoice] = useState<"" | "legitimate" | "unjustified">("");
  const [penaltyPercent, setPenaltyPercent] = useState(15);
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
      const data = await listAdminRefunds({ status: statusTab, q: searchQuery });
      setRows(data.requests ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải yêu cầu hoàn tiền.";
      setToast({ type: "err", message });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusTab, searchQuery]);

  const loadDetail = useCallback(async (requestId: string) => {
    setDetailLoading(true);
    setActionError("");
    try {
      setDetail(await getAdminRefundDetail(requestId));
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
    if (initialRequestId) {
      const match = rows.find((r) => r.id === initialRequestId);
      if (match) {
        setSelectedId(match.id);
        return;
      }
    }
    if (!selectedId) setSelectedId(rows[0].id);
  }, [rows, initialRequestId, selectedId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleResolve(resolution: "approve" | "reject") {
    if (!selectedId) return;
    const label = resolution === "approve" ? "Duyệt hoàn tiền cho khách hàng" : "Từ chối yêu cầu";
    if (!window.confirm(`${t("Xác nhận: ")}${label}?`)) return;

    setResolveBusy(true);
    setActionError("");
    try {
      const result = await resolveAdminRefund(selectedId, {
        resolution,
        adminNote: adminNote.trim() || undefined,
        legitimacy: legitimacyChoice || undefined,
        penaltyPercent: legitimacyChoice === "unjustified" ? penaltyPercent : undefined,
      });
      setToast({ type: "ok", message: result.message });
      setAdminNote("");
      setLegitimacyChoice("");
      await load();
      await loadDetail(selectedId);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xử lý yêu cầu.";
      setActionError(message);
    } finally {
      setResolveBusy(false);
    }
  }

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  const adminSettlementPreview = useMemo(() => {
    if (!selected) return null;
    const legitimacy =
      legitimacyChoice ||
      (selected.legitimacy === "legitimate" || selected.legitimacy === "unjustified"
        ? selected.legitimacy
        : "needs_review");
    return computeRefundSettlement({
      agreedPrice: selected.agreed_price,
      workflowStage: selected.workflow_stage_at_request || selected.workflow_stage,
      hasProgress: selected.had_progress_at_request ?? false,
      reasonCode: selected.reason_code,
      legitimacyOverride:
        legitimacy === "legitimate" || legitimacy === "unjustified" ? legitimacy : "unjustified",
      penaltyPercent: penaltyPercent / 100,
    });
  }, [selected, legitimacyChoice, penaltyPercent]);

  return (
    <div className="admin-page admin-refunds-page">
      <header className="admin-page__head admin-refunds-page__head">
        <h1 className="admin-page__title">{t("Quản lý hoàn tiền")}</h1>
        <p className="admin-page__lead">
          {t("Xem xét yêu cầu hủy & hoàn tiền, phân loại chính đáng / hủy ngang và duyệt phân bổ Khách hàng — Freelancer (hoàn về ví VLC).")}
        </p>
      </header>

      {toast ? (
        <p
          className={`admin-toast admin-toast--${toast.type === "ok" ? "ok" : "err"}`}
          role="status"
        >
          {t(toast.message)}
        </p>
      ) : null}

      <div className="admin-refunds-toolbar" aria-label={t("Bộ lọc hoàn tiền")}>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-refunds-toolbar__refresh"
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

        <label className="admin-refunds-toolbar__field admin-refunds-toolbar__field--search">
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

        <p className="admin-refunds-toolbar__count" aria-live="polite">
          {loading ? "Đang tải..." : `${total} yêu cầu`}
        </p>
      </div>

      {loading ? (
        <p className="admin-page__state admin-refunds-page__state">{t("Đang tải danh sách hoàn tiền...")}</p>
      ) : !rows.length ? (
        <div className="admin-empty admin-refunds-page__state">
          <p>{t("Không có yêu cầu hoàn tiền phù hợp bộ lọc.")}</p>
        </div>
      ) : (
        <div className="admin-refunds-split">
          <aside className="admin-refunds-list" aria-label={t("Danh sách hoàn tiền")}>
            <ul className="resolution-list resolution-list--compact admin-refunds-list__inner">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`resolution-card resolution-card--selectable${row.id === selected?.id ? " resolution-card--active" : ""}`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <h3 className="resolution-card__title">{orderTitle(row)}</h3>
                    <p className="resolution-card__meta">
                      {formatDateUi(row.created_at)} · {formatVndUi(row.agreed_price)}
                    </p>
                    <p className="resolution-card__meta">
                      {row.client_name} ↔ {row.freelancer_name}
                    </p>
                    <span
                      className={`resolution-card__status resolution-card__status--${row.status === "pending" ? "open" : row.status === "rejected" ? "rejected" : "resolved"}`}
                    >
                      {adminRefundRequestStatusLabel(row.status)}
                      {isOverdue(row) ? " · Quá hạn" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="admin-refunds-detail">
            {selected ? (
              <>
                <div className="resolution-card resolution-card--flat">
                  <h3 className="resolution-card__title">{orderTitle(selected)}</h3>
                  <p className="resolution-card__meta">
                    Khách hàng: <strong>{selected.client_name}</strong> ({selected.client_email}) ·
                    Freelancer: <strong>{selected.freelancer_name}</strong> ({selected.freelancer_email})
                  </p>
                  <p className="resolution-card__meta">
                    Số tiền: {formatVndUi(selected.agreed_price)} · Ký quỹ:{" "}
                    {selected.escrow_status || "—"} · Giai đoạn: {selected.workflow_stage || "—"}
                  </p>

                  <ResolutionProgressBar
                    steps={REFUND_PROGRESS_STEPS}
                    activeIndex={refundProgressIndex(selected.status, selected.escrow_status)}
                    failed={String(selected.status).toLowerCase() === "rejected"}
                    failedLabel="Yêu cầu bị từ chối"
                  />

                  <dl className="resolution-card__details admin-refund-case__details">
                    <div>
                      <dt>{t("Lý do từ khách hàng")}</dt>
                      <dd>
                        {selected.reason_code
                          ? refundReasonLabel(selected.reason_code)
                          : selected.reason}
                        {selected.detail ? ` — ${selected.detail}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Hoàn về")}</dt>
                      <dd>{t("Ví VLC")}</dd>
                    </div>
                    {selected.legitimacy ? (
                      <div>
                        <dt>{t("Phân loại hệ thống")}</dt>
                        <dd>{legitimacyLabel(selected.legitimacy as "legitimate" | "unjustified" | "needs_review")}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{t("Giai đoạn khi gửi")}</dt>
                      <dd>
                        {selected.workflow_stage_at_request || selected.workflow_stage || "—"}
                        {selected.had_progress_at_request ? " · đã có tiến độ" : " · chưa có tiến độ"}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Gửi lúc")}</dt>
                      <dd>{formatDateUi(selected.created_at)}</dd>
                    </div>
                    {String(selected.status).toLowerCase() === "pending" ? (
                      <div>
                        <dt>{t("Hạn phản hồi FL")}</dt>
                        <dd>
                          {formatDateUi(selected.respond_by_at)} · còn{" "}
                          {formatDeadlineCountdown(selected.respond_by_at) || "—"}
                          {isOverdue(selected) ? " (đã quá hạn — có thể can thiệp)" : ""}
                        </dd>
                      </div>
                    ) : null}
                    {selected.freelancer_response ? (
                      <div>
                        <dt>{t("Phản hồi freelancer")}</dt>
                        <dd>{selected.freelancer_response}</dd>
                      </div>
                    ) : null}
                    {selected.resolved_at ? (
                      <div>
                        <dt>{t("Xử lý lúc")}</dt>
                        <dd>{formatDateUi(selected.resolved_at)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <RefundSettlementBreakdown
                    agreedPrice={selected.agreed_price}
                    workflowStage={selected.workflow_stage_at_request || selected.workflow_stage}
                    hasProgress={selected.had_progress_at_request ?? false}
                    reasonCode={selected.reason_code}
                    legitimacy={selected.legitimacy}
                    splitType={selected.split_type}
                    penaltyPercent={selected.penalty_percent}
                    clientAmount={selected.client_refund_amount}
                    freelancerAmount={selected.freelancer_amount}
                    platformFeeAmount={selected.platform_fee_amount}
                    audience="admin"
                  />
                </div>

                {String(selected.status).toLowerCase() === "pending" ? (
                  <div className="admin-resolve-panel">
                    <h4 className="admin-resolve-panel__title">{t("Quyết định phân bổ")}</h4>
                    <p className="admin-resolve-panel__hint">
                      {t("Chọn mức chính đáng trước khi duyệt. Lý do \"khác\" mặc định chờ admin — có thể đánh dấu chính đáng (50/50 ở GĐ3) hoặc hủy ngang (phí phạt 10–25% + việc đã làm).")}
                    </p>
                    {actionError ? (
                      <p className="admin-toast admin-toast--err" role="alert">
                        {actionError}
                      </p>
                    ) : null}
                    <div className="admin-refund-resolve-fields">
                      <label className="admin-field">
                        <span className="admin-field__label">{t("Phân loại (khi duyệt)")}</span>
                        <select
                          className="admin-filters__select"
                          value={legitimacyChoice}
                          onChange={(e) =>
                            setLegitimacyChoice(
                              e.target.value as "" | "legitimate" | "unjustified",
                            )
                          }
                          disabled={resolveBusy}
                        >
                          <option value="">{t("Theo hệ thống / lý do")}</option>
                          <option value="legitimate">{t("Chính đáng")}</option>
                          <option value="unjustified">{t("Không chính đáng / hủy ngang")}</option>
                        </select>
                      </label>
                      {legitimacyChoice === "unjustified" ||
                      selected.legitimacy === "unjustified" ? (
                        <label className="admin-field">
                          <span className="admin-field__label">{t("Phí phạt (% tổng giá trị)")}</span>
                          <input
                            type="number"
                            className="admin-filters__input"
                            min={10}
                            max={25}
                            value={penaltyPercent}
                            onChange={(e) => setPenaltyPercent(Number(e.target.value) || 15)}
                            disabled={resolveBusy}
                          />
                        </label>
                      ) : null}
                    </div>
                    {adminSettlementPreview ? (
                      <RefundSettlementBreakdown
                        agreedPrice={selected.agreed_price}
                        workflowStage={selected.workflow_stage_at_request || selected.workflow_stage}
                        hasProgress={selected.had_progress_at_request ?? false}
                        reasonCode={selected.reason_code}
                        legitimacy={adminSettlementPreview.legitimacy}
                        splitType={adminSettlementPreview.splitType}
                        penaltyPercent={adminSettlementPreview.penaltyPercent}
                        clientAmount={adminSettlementPreview.clientAmount}
                        freelancerAmount={adminSettlementPreview.freelancerAmount}
                        platformFeeAmount={adminSettlementPreview.platformFeeAmount}
                        audience="admin"
                        compact
                      />
                    ) : null}
                    <label className="admin-field">
                      <span className="admin-field__label">{t("Ghi chú (tùy chọn)")}</span>
                      <textarea
                        className="admin-textarea"
                        rows={3}
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder={t("Lý do quyết định, hướng dẫn cho các bên...")}
                        disabled={resolveBusy}
                      />
                    </label>
                    <div className="admin-resolve-panel__actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        disabled={resolveBusy}
                        onClick={() => void handleResolve("approve")}
                      >
                        {t("Duyệt phân bổ")}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={resolveBusy}
                        onClick={() => void handleResolve("reject")}
                      >
                        {t("Từ chối yêu cầu")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {detailLoading ? (
                  <p className="admin-page__state">{t("Đang tải lịch sử...")}</p>
                ) : detail?.events.length ? (
                  <section className="admin-refund-events" aria-label={t("Lịch sử xử lý")}>
                    <h4 className="admin-refund-events__title">{t("Lịch sử liên quan")}</h4>
                    <ul className="admin-refund-events__list">
                      {detail.events.map((event) => (
                        <li key={`${event.event_type}-${event.created_at}`}>
                          <span className="admin-refund-events__type">{event.event_type}</span>
                          <span className="admin-refund-events__time">
                            {formatDateUi(event.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
