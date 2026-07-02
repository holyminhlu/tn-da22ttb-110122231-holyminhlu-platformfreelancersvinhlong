"use client";

import { formatDateUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { FaEye, FaEyeSlash, FaRedo, FaSearch, FaTrashAlt } from "react-icons/fa";
import {
  getAdminJobDetail,
  listAdminJobs,
  moderateAdminJob,
  type AdminJobRow,
  type AdminJobStatusFilter,
  type AdminJobVisibilityFilter,
} from "@/lib/api/admin";
import { jobStatusLabel, parseJobImages, parseJobTags } from "@/lib/jobsDisplay";
import { resolveAvatarSrc } from "@/lib/authSession";
import "./admin.css";

const VISIBILITY_TABS: { id: AdminJobVisibilityFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "visible", label: "Đang hiển thị" },
  { id: "hidden", label: "Đã ẩn" },
  { id: "deleted", label: "Đã xóa" },
];

const STATUS_OPTIONS: { id: AdminJobStatusFilter; label: string }[] = [
  { id: "all", label: "Mọi trạng thái" },
  { id: "open", label: "Đang mở" },
  { id: "in_progress", label: "Đang thực hiện" },
  { id: "closed", label: "Đã đóng" },
  { id: "cancelled", label: "Đã hủy" },
];

function moderationBadge(job: AdminJobRow): { label: string; tone: string } {
  if (job.deleted_at) return { label: "Đã xóa", tone: "deleted" };
  if (job.admin_hidden_at) return { label: "Ẩn bởi admin", tone: "hidden" };
  return { label: jobStatusLabel(job.status), tone: job.status || "default" };
}

function budgetLabel(job: AdminJobRow): string {
  const base = formatVndUi(job.budget);
  if (job.budget_type === "hourly") return `${base}/giờ`;
  if (job.budget_max != null && Number(job.budget_max) > Number(job.budget || 0)) {
    return `${base} – ${formatVndUi(job.budget_max)}`;
  }
  return base;
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="admin-posts-field">
      <span className="admin-posts-field__label">{label}</span>
      <div className="admin-posts-field__value">{value}</div>
    </div>
  );
}

export default function AdminPostsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("job");

  const [visibilityTab, setVisibilityTab] = useState<AdminJobVisibilityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AdminJobStatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<AdminJobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminJobRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? detail,
    [rows, selectedId, detail],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const data = await listAdminJobs({
        visibility: visibilityTab,
        status: statusFilter,
        q: searchQuery,
        limit: 50,
      });
      setRows(data.jobs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách bài đăng.";
      setToast({ type: "err", message });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [visibilityTab, statusFilter, searchQuery]);

  const loadDetail = useCallback(async (jobId: string) => {
    setDetailLoading(true);
    setActionError("");
    try {
      const data = await getAdminJobDetail(jobId);
      setDetail(data.job);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết bài đăng.";
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
    if (!rows.length) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    if (initialJobId && rows.some((row) => row.id === initialJobId)) {
      setSelectedId(initialJobId);
      return;
    }
    setSelectedId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : rows[0].id));
  }, [rows, initialJobId]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function runModeration(action: "hide" | "unhide" | "delete") {
    if (!selectedId) return;
    setBusy(true);
    setActionError("");
    setToast(null);

    if (action === "delete") {
      const ok = window.confirm(
        "Xóa bài đăng sẽ gỡ khỏi hệ thống và gửi thông báo cho khách hàng. Tiếp tục?",
      );
      if (!ok) {
        setBusy(false);
        return;
      }
    }

    try {
      const result = await moderateAdminJob(selectedId, {
        action,
        reason: reason.trim() || undefined,
      });
      setToast({ type: "ok", message: result.message });
      setReason("");
      if (result.job) setDetail(result.job);
      await load();
      if (selectedId) await loadDetail(selectedId);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xử lý bài đăng.";
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  const detailImages = detail ? parseJobImages(detail.images) : [];
  const detailTags = detail ? parseJobTags(detail.tags) : [];
  const canHide = Boolean(detail && !detail.deleted_at && !detail.admin_hidden_at);
  const canUnhide = Boolean(detail && !detail.deleted_at && detail.admin_hidden_at);
  const canDelete = Boolean(detail && !detail.deleted_at);

  return (
    <div className="admin-page admin-posts-page">
      <header className="admin-page__head admin-posts-page__head">
        <h1 className="admin-page__title">{t("Quản lý Bài đăng")}</h1>
        <p className="admin-page__subtitle">
          {t("Xem, ẩn hoặc xóa bài đăng việc của khách hàng khi có dấu hiệu vi phạm.")}
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

      <div className="admin-posts-toolbar" aria-label={t("Bộ lọc bài đăng")}>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-posts-toolbar__refresh"
          onClick={() => void load()}
        >
          <FaRedo aria-hidden /> {t("Làm mới")}
        </button>

        <div className="admin-tabs admin-tabs--inline" role="tablist" aria-label={t("Hiển thị")}>
          {VISIBILITY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={visibilityTab === tab.id}
              className={`admin-tab${visibilityTab === tab.id ? " admin-tab--active" : ""}`}
              onClick={() => setVisibilityTab(tab.id)}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        <label className="admin-posts-toolbar__field">
          <span className="admin-filters__label">{t("Trạng thái")}</span>
          <select
            className="admin-filters__select admin-posts-toolbar__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AdminJobStatusFilter)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-posts-toolbar__field admin-posts-toolbar__field--search">
          <span className="admin-filters__label">{t("Tìm kiếm")}</span>
          <div className="admin-filters__search-wrap">
            <FaSearch className="admin-filters__search-icon" aria-hidden />
            <input
              type="search"
              className="admin-filters__input"
              placeholder={t("Tiêu đề, khách hàng, email...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label={t("Tìm theo tiêu đề hoặc khách hàng")}
            />
          </div>
        </label>

        <p className="admin-posts-toolbar__count" aria-live="polite">
          {loading ? t("Đang tải...") : `${total} bài đăng`}
        </p>
      </div>

      {loading ? (
        <p className="admin-page__state admin-posts-page__state">{t("Đang tải danh sách bài đăng...")}</p>
      ) : !rows.length ? (
        <div className="admin-empty admin-posts-page__state">
          <p>{t("Không có bài đăng phù hợp bộ lọc.")}</p>
        </div>
      ) : (
        <div className="admin-posts-split">
          <aside className="admin-posts-list" aria-label={t("Danh sách bài đăng")}>
            <ul className="resolution-list resolution-list--compact admin-posts-list__inner">
              {rows.map((row) => {
                const badge = moderationBadge(row);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`resolution-card resolution-card--selectable${row.id === selected?.id ? " resolution-card--active" : ""}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <h3 className="resolution-card__title">{row.title}</h3>
                      <p className="resolution-card__meta">
                        {row.client_name || "—"} · {formatDateUi(row.created_at)}
                      </p>
                      <p className="resolution-card__meta">
                        {budgetLabel(row)} · {row.quote_count} báo giá
                      </p>
                      <span className={`admin-posts-badge admin-posts-badge--${badge.tone}`}>
                        {badge.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="admin-posts-detail">
            {detailLoading && !detail ? (
              <p className="admin-page__state">{t("Đang tải chi tiết...")}</p>
            ) : selected && detail ? (
              <>
                <section className="admin-posts-detail__card" aria-label={t("Chi tiết bài đăng")}>
                  <div className="admin-posts-detail__head">
                    <div>
                      <h2 className="admin-posts-detail__title">{detail.title}</h2>
                      <p className="admin-posts-detail__meta">
                        {t("Đăng")} {formatDateUi(detail.created_at)} ·{" "}
                        <span className={`admin-posts-badge admin-posts-badge--${moderationBadge(detail).tone}`}>
                          {moderationBadge(detail).label}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="admin-posts-client">
                    {detail.client_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveAvatarSrc(detail.client_avatar_url)}
                        alt=""
                        className="admin-posts-client__avatar"
                      />
                    ) : (
                      <span className="admin-posts-client__avatar admin-posts-client__avatar--placeholder">
                        {(detail.client_name || "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="admin-posts-client__name">{detail.client_name || "—"}</p>
                      <p className="admin-posts-client__contact">
                        {detail.client_email || "—"}
                        {detail.client_phone ? ` · ${detail.client_phone}` : ""}
                      </p>
                      {detail.client_district_city ? (
                        <p className="admin-posts-client__contact">{detail.client_district_city}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="admin-posts-detail__grid">
                    <DetailField label={t("Ngân sách")} value={budgetLabel(detail)} />
                    <DetailField label={t("Danh mục")} value={detail.category?.trim() || "—"} />
                    <DetailField
                      label={t("Địa điểm")}
                      value={detail.location_label?.trim() || detail.client_district_city || "—"}
                    />
                    <DetailField
                      label={t("Hạn hoàn thành")}
                      value={detail.due_at ? formatDateUi(detail.due_at) : "—"}
                    />
                    <DetailField label={t("Báo giá")} value={`${detail.quote_count}`} />
                    <DetailField label={t("Hợp đồng")} value={`${detail.contract_count}`} />
                  </div>

                  <DetailField
                    label={t("Mô tả công việc")}
                    value={
                      <p className="admin-posts-detail__description">
                        {detail.description?.trim() || "—"}
                      </p>
                    }
                  />

                  {detailTags.length > 0 ? (
                    <DetailField
                      label={t("Thẻ")}
                      value={
                        <ul className="admin-posts-tags">
                          {detailTags.map((tag) => (
                            <li key={tag}>{tag}</li>
                          ))}
                        </ul>
                      }
                    />
                  ) : null}

                  {detailImages.length > 0 ? (
                    <DetailField
                      label={t("Hình ảnh")}
                      value={
                        <ul className="admin-posts-gallery">
                          {detailImages.map((src) => (
                            <li key={src}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt="" className="admin-posts-gallery__img" />
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  ) : null}

                  {detail.admin_hidden_reason ? (
                    <DetailField
                      label={t("Lý do ẩn trước đó")}
                      value={detail.admin_hidden_reason}
                    />
                  ) : null}
                </section>

                <section className="admin-posts-moderate" aria-label={t("Xử lý vi phạm")}>
                  <h3 className="admin-posts-moderate__title">{t("Xử lý vi phạm")}</h3>
                  <p className="admin-posts-moderate__hint">
                    {t(
                      "Nhập lý do (ít nhất 10 ký tự) khi ẩn hoặc xóa. Hệ thống sẽ gửi thông báo in-app cho khách hàng đăng bài.",
                    )}
                  </p>

                  <label className="admin-field admin-posts-moderate__field">
                    <span className="admin-field__label">{t("Lý do / ghi chú gửi khách hàng")}</span>
                    <textarea
                      className="admin-textarea admin-posts-moderate__textarea"
                      rows={4}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t("Ví dụ: Nội dung trùng lặp, yêu cầu trái quy định, thông tin sai lệch...")}
                    />
                  </label>

                  {actionError ? (
                    <p className="admin-toast admin-toast--err" role="alert">
                      {actionError}
                    </p>
                  ) : null}

                  <div className="admin-posts-moderate__actions">
                    {canHide ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        disabled={busy || reason.trim().length < 10}
                        onClick={() => void runModeration("hide")}
                      >
                        <FaEyeSlash aria-hidden /> {t("Ẩn bài đăng")}
                      </button>
                    ) : null}
                    {canUnhide ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        disabled={busy}
                        onClick={() => void runModeration("unhide")}
                      >
                        <FaEye aria-hidden /> {t("Hiển thị lại")}
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        disabled={busy || reason.trim().length < 10}
                        onClick={() => void runModeration("delete")}
                      >
                        <FaTrashAlt aria-hidden /> {t("Xóa bài đăng")}
                      </button>
                    ) : null}
                  </div>
                </section>
              </>
            ) : (
              <p className="admin-page__state">{t("Chọn một bài đăng để xem chi tiết.")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
