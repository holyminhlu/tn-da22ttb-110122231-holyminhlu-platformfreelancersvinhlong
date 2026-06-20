"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { FaRedo, FaSearch } from "react-icons/fa";
import {
  approveFreelancerAccount,
  getFreelancerApproval,
  listFreelancerApprovals,
  rejectFreelancerAccount,
  type AdminReviewStatus,
  type AdminRoleFilter,
  type FreelancerApprovalItem,
} from "@/lib/api/admin";
import AdminIdentityReviewDetail from "./AdminIdentityReviewDetail";
import "./admin.css";

const TABS: { id: AdminReviewStatus; label: string }[] = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối" },
];

const ROLE_OPTIONS: { id: AdminRoleFilter; label: string }[] = [
  { id: "all", label: "Tất cả vai trò" },
  { id: "client", label: "Client" },
  { id: "freelancer", label: "Freelancer" },
];

function stepBadge(done: boolean) {
  return (
    <span className={`admin-badge ${done ? "admin-badge--ok" : "admin-badge--bad"}`}>
      {done ? "Xong" : "Thiếu"}
    </span>
  );
}

function reviewBadge(status: string) {
  const t = tUi;
  const s = status.toLowerCase();
  if (s === "approved") return <span className="admin-badge admin-badge--ok">{tUi("Đã duyệt")}</span>;
  if (s === "rejected") return <span className="admin-badge admin-badge--bad">{tUi("Từ chối")}</span>;
  return <span className="admin-badge admin-badge--pending">{tUi("Chờ duyệt")}</span>;
}

export default function FreelancerApprovalPage() {  const { t, formatDate } = useTranslation();
  const [tab, setTab] = useState<AdminReviewStatus>("pending");
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [items, setItems] = useState<FreelancerApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<FreelancerApprovalItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFreelancerApprovals({
        status: tab,
        role: roleFilter,
        q: searchQuery,
        readyOnly,
        incompleteOnly,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách.";
      setToast({ type: "err", message: msg });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, roleFilter, searchQuery, readyOnly, incompleteOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetFilters() {
  const t = tUi;
  const formatDate = formatDateUi;
    setRoleFilter("all");
    setSearchInput("");
    setSearchQuery("");
    setReadyOnly(false);
    setIncompleteOnly(false);
  }

  const hasActiveFilters =
    roleFilter !== "all" || searchQuery !== "" || readyOnly || incompleteOnly;

  async function toggleDetail(userId: string) {
  const t = tUi;
  const formatDate = formatDateUi;
    if (expandedId === userId) {
      setExpandedId(null);
      setDetailItem(null);
      return;
    }
    setExpandedId(userId);
    setDetailLoading(true);
    setDetailItem(null);
    try {
      const data = await getFreelancerApproval(userId);
      setDetailItem(data.item);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết hồ sơ.";
      setToast({ type: "err", message: msg });
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleApprove(userId: string, role: string) {
  const t = tUi;
  const formatDate = formatDateUi;
    const label = role === "client" ? "client" : "freelancer";
    if (
      !window.confirm(
        `Duyệt hồ sơ xác minh ${label} này?${role === "freelancer" ? " Họ sẽ có thể báo giá và thao tác với job." : ""}`,
      )
    ) {
      return;
    }
    setBusyId(userId);
    setToast(null);
    try {
      const result = await approveFreelancerAccount(userId);
      setToast({ type: "ok", message: result.message });
      await load();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể duyệt.";
      setToast({ type: "err", message: msg });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(userId: string) {
  const t = tUi;
  const formatDate = formatDateUi;
    const note = window.prompt(t("Lý do từ chối (tuỳ chọn):"));
    if (note === null) return;
    setBusyId(userId);
    setToast(null);
    try {
      const result = await rejectFreelancerAccount(userId, note || undefined);
      setToast({ type: "ok", message: result.message });
      await load();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể từ chối.";
      setToast({ type: "err", message: msg });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1 className="admin-page__title">{t("Duyệt xác minh danh tính")}</h1>
      </header>

      {toast ? (
        <div className={`admin-toast admin-toast--${toast.type === "ok" ? "ok" : "err"}`} role="status">
          {t(toast.message)}
        </div>
      ) : null}

      <div className="admin-tabs" role="tablist">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            role="tab"
            className={`admin-tab${tab === tabItem.id ? " admin-tab--active" : ""}`}
            aria-selected={tab === tabItem.id}
            onClick={() => setTab(tabItem.id)}
          >
            {t(tabItem.label)}
          </button>
        ))}
      </div>

      <div className="admin-filters" aria-label={t("Bộ lọc hồ sơ")}>
        <div className="admin-filters__row">
          <label className="admin-filters__field admin-filters__field--search">
            <span className="admin-filters__label">{t("Tìm kiếm")}</span>
            <div className="admin-filters__search-wrap">
              <FaSearch className="admin-filters__search-icon" aria-hidden />
              <input
                type="search"
                className="admin-filters__input"
                placeholder={t("Email, tên hồ sơ…")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </label>

          <label className="admin-filters__field">
            <span className="admin-filters__label">{t("Vai trò")}</span>
            <select
              className="admin-filters__select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as AdminRoleFilter)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-filters__checks">
            <label className="admin-filters__check">
              <input
                type="checkbox"
                checked={readyOnly}
                onChange={(e) => {
                  setReadyOnly(e.target.checked);
                  if (e.target.checked) setIncompleteOnly(false);
                }}
              />
              <span>{t("Đủ điều kiện duyệt")}</span>
            </label>
            <label className="admin-filters__check">
              <input
                type="checkbox"
                checked={incompleteOnly}
                onChange={(e) => {
                  setIncompleteOnly(e.target.checked);
                  if (e.target.checked) setReadyOnly(false);
                }}
              />
              <span>{t("Thiếu bước xác minh")}</span>
            </label>
          </div>
        </div>

        <div className="admin-filters__meta">
          <p className="admin-filters__count" role="status">
            {loading ? "Đang tải…" : `Hiển thị ${total} hồ sơ`}
          </p>
          <div className="admin-filters__actions">
            {hasActiveFilters ? (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={resetFilters}>
                {t("Xóa bộ lọc")}
              </button>
            ) : null}
            <button
              type="button"
              className="admin-btn"
              onClick={() => void load()}
              disabled={loading}
            >
              <FaRedo aria-hidden /> {t("Làm mới")}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <p className="admin-empty">{t("Đang tải…")}</p>
        ) : items.length === 0 ? (
          <p className="admin-empty">
            {hasActiveFilters
              ? "Không có hồ sơ phù hợp bộ lọc. Thử đổi điều kiện hoặc xóa bộ lọc."
              : "Không có hồ sơ nào trong mục này."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Người dùng")}</th>
                <th>{t("Vai trò")}</th>
                <th>{t("Bước 1")}</th>
                <th>{t("Bước 2")}</th>
                <th>{t("Bước 3")}</th>
                <th>{t("Trạng thái")}</th>
                <th>{t("Gửi lúc")}</th>
                <th>{t("Thao tác")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.userId}>
                  <tr>
                    <td>
                      <strong>{item.fullName || "—"}</strong>
                      <br />
                      <span className="admin-table__email">{item.email}</span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge--role">
                        {item.role === "client" ? "Client" : "Freelancer"}
                      </span>
                    </td>
                    <td>{stepBadge(item.step1Complete)}</td>
                    <td>{stepBadge(item.step2Complete)}</td>
                    <td>{stepBadge(item.step3Complete)}</td>
                    <td>{reviewBadge(item.adminReviewStatus)}</td>
                    <td>{item.submittedAt ? formatDateUi(item.submittedAt) : "—"}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary"
                          disabled={busyId === item.userId || tab !== "pending" || !item.canApprove}
                          onClick={() => void handleApprove(item.userId, item.role)}
                        >
                          {t("Duyệt")}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          disabled={busyId === item.userId || tab !== "pending"}
                          onClick={() => void handleReject(item.userId)}
                        >
                          {t("Từ chối")}
                        </button>
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => void toggleDetail(item.userId)}
                        >
                          {expandedId === item.userId ? "Thu gọn" : "Chi tiết"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === item.userId ? (
                    <tr>
                      <td colSpan={8}>
                        <AdminIdentityReviewDetail
                          item={detailItem || item}
                          loading={detailLoading && !detailItem}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
