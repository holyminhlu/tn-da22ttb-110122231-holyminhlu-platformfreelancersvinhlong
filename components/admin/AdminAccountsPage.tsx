"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { FaRedo, FaSearch } from "react-icons/fa";
import {
  getAdminUser,
  listAdminUsers,
  updateAdminUserStatus,
  type AdminUserItem,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
} from "@/lib/api/admin";
import AdminUserEditModal from "./AdminUserEditModal";
import AdminUserFullDetailModal from "./AdminUserFullDetailModal";
import "./admin.css";

const STATUS_TABS: { id: AdminUserStatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Hoạt động" },
  { id: "rejected", label: "Đã khóa" },
  { id: "deactivated", label: "Tự tạm khóa" },
];

const ROLE_OPTIONS: { id: AdminUserRoleFilter; label: string }[] = [
  { id: "all", label: "Tất cả vai trò" },
  { id: "client", label: "Khách hàng" },
  { id: "freelancer", label: "Freelancer" },
  { id: "admin", label: "Admin" },
];

const PAGE_SIZE = 25;

function roleLabel(role: string) {
  const r = role.toLowerCase();
  if (r === "client") return "Khách hàng";
  if (r === "freelancer") return "Freelancer";
  if (r === "admin" || r === "administrator") return "Admin";
  return role;
}

function accountStatusBadge(item: AdminUserItem) {
  if (item.deactivatedAt) {
    return <span className="admin-badge admin-badge--pending">Tự tạm khóa</span>;
  }
  if (String(item.status).toLowerCase() === "rejected") {
    return <span className="admin-badge admin-badge--bad">Đã khóa</span>;
  }
  return <span className="admin-badge admin-badge--ok">Hoạt động</span>;
}

function reviewBadge(status: string | null) {
  if (!status) return <span className="admin-badge">Chưa gửi</span>;
  const s = status.toLowerCase();
  if (s === "approved") return <span className="admin-badge admin-badge--ok">Đã duyệt</span>;
  if (s === "rejected") return <span className="admin-badge admin-badge--bad">Từ chối</span>;
  if (s === "pending") return <span className="admin-badge admin-badge--pending">Chờ duyệt</span>;
  return <span className="admin-badge">{status}</span>;
}

function verifyBadge(done: boolean, label: string) {
  return (
    <span className={`admin-badge ${done ? "admin-badge--ok" : "admin-badge--bad"}`}>{label}</span>
  );
}

export default function AdminAccountsPage() {
  const { t, formatDate } = useTranslation();
  const [statusTab, setStatusTab] = useState<AdminUserStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<AdminUserItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [fullDetailUserId, setFullDetailUserId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const data = await listAdminUsers({
        status: statusTab,
        role: roleFilter,
        q: searchQuery,
        page,
        limit: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách tài khoản.";
      setToast({ type: "err", message: msg });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusTab, roleFilter, searchQuery, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetFilters() {
    setRoleFilter("all");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }

  const hasActiveFilters = roleFilter !== "all" || searchQuery !== "";
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function toggleDetail(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
      setDetailItem(null);
      return;
    }
    setExpandedId(userId);
    setDetailLoading(true);
    setDetailItem(null);
    try {
      const data = await getAdminUser(userId);
      setDetailItem(data.item);
    } catch {
      const fallback = items.find((item) => item.userId === userId) ?? null;
      setDetailItem(fallback);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleStatusChange(userId: string, nextStatus: "active" | "rejected") {
    const label = nextStatus === "active" ? "kích hoạt" : "khóa";
    if (!window.confirm(`Xác nhận ${label} tài khoản này?`)) return;

    setBusyId(userId);
    setToast(null);
    try {
      const result = await updateAdminUserStatus(userId, nextStatus);
      setToast({ type: "ok", message: result.message });
      await load();
      if (expandedId === userId) {
        const data = await getAdminUser(userId);
        setDetailItem(data.item);
      }
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật trạng thái.";
      setToast({ type: "err", message: msg });
    } finally {
      setBusyId(null);
    }
  }

  function canManageStatus(item: AdminUserItem) {
    const role = item.role.toLowerCase();
    return role !== "admin" && role !== "administrator";
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1 className="admin-page__title">{t("Quản lý tài khoản")}</h1>
        <p className="admin-page__desc">
          {t("Xem và quản lý tất cả tài khoản người dùng trong hệ thống.")}
        </p>
      </header>

      {toast ? (
        <p className={`admin-toast admin-toast--${toast.type}`} role="status">
          {toast.message}
        </p>
      ) : null}

      <div className="admin-tabs" role="tablist" aria-label={t("Lọc theo trạng thái")}>
        {STATUS_TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            role="tab"
            className={`admin-tab${statusTab === tabItem.id ? " admin-tab--active" : ""}`}
            aria-selected={statusTab === tabItem.id}
            onClick={() => {
              setStatusTab(tabItem.id);
              setPage(1);
            }}
          >
            {t(tabItem.label)}
          </button>
        ))}
      </div>

      <div className="admin-filters" aria-label={t("Bộ lọc tài khoản")}>
        <div className="admin-filters__row">
          <label className="admin-filters__field admin-filters__field--search">
            <span className="admin-filters__label">{t("Tìm kiếm")}</span>
            <div className="admin-filters__search-wrap">
              <FaSearch className="admin-filters__search-icon" aria-hidden />
              <input
                type="search"
                className="admin-filters__input"
                placeholder={t("Email, tên, số điện thoại…")}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </label>

          <label className="admin-filters__field">
            <span className="admin-filters__label">{t("Vai trò")}</span>
            <select
              className="admin-filters__select"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as AdminUserRoleFilter);
                setPage(1);
              }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-filters__meta">
          <p className="admin-filters__count" role="status">
            {loading
              ? t("Đang tải…")
              : `${t("Hiển thị")} ${items.length} / ${total} ${t("tài khoản")}`}
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
            {hasActiveFilters || statusTab !== "all"
              ? t("Không có tài khoản phù hợp bộ lọc.")
              : t("Chưa có tài khoản nào.")}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Người dùng")}</th>
                <th>{t("Vai trò")}</th>
                <th>{t("Trạng thái")}</th>
                <th>{t("Xác minh")}</th>
                <th>{t("Duyệt KYC")}</th>
                <th>{t("Ngày tạo")}</th>
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
                      {item.phone ? (
                        <>
                          <br />
                          <span className="admin-table__muted">{item.phone}</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge--role">{roleLabel(item.role)}</span>
                    </td>
                    <td>{accountStatusBadge(item)}</td>
                    <td>
                      <div className="admin-table__stack">
                        {verifyBadge(item.isEmailVerified, "Email")}
                        {verifyBadge(item.isPhoneVerified, "SĐT")}
                      </div>
                    </td>
                    <td>{reviewBadge(item.adminReviewStatus)}</td>
                    <td>{item.createdAt ? formatDate(item.createdAt) : "—"}</td>
                    <td>
                      <div className="admin-actions">
                        {canManageStatus(item) ? (
                          String(item.status).toLowerCase() === "rejected" ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn--primary"
                              disabled={busyId === item.userId}
                              onClick={() => void handleStatusChange(item.userId, "active")}
                            >
                              {t("Kích hoạt")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn--danger"
                              disabled={busyId === item.userId}
                              onClick={() => void handleStatusChange(item.userId, "rejected")}
                            >
                              {t("Khóa")}
                            </button>
                          )
                        ) : null}
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary"
                          onClick={() => setEditUserId(item.userId)}
                        >
                          {t("Chỉnh sửa")}
                        </button>
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => void toggleDetail(item.userId)}
                        >
                          {expandedId === item.userId ? t("Thu gọn") : t("Chi tiết")}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === item.userId ? (
                    <tr>
                      <td colSpan={7}>
                        <AdminAccountDetail
                          item={detailItem || item}
                          loading={detailLoading && !detailItem}
                          formatDate={formatDate}
                          onOpenFullDetail={() => setFullDetailUserId(item.userId)}
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

      {totalPages > 1 ? (
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t("Trang trước")}
          </button>
          <span className="admin-pagination__info">
            {t("Trang")} {page} / {totalPages}
          </span>
          <button
            type="button"
            className="admin-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            {t("Trang sau")}
          </button>
        </div>
      ) : null}

      {editUserId ? (
        <AdminUserEditModal
          userId={editUserId}
          onClose={() => setEditUserId(null)}
          onSaved={() => {
            setToast({ type: "ok", message: t("Đã cập nhật thông tin tài khoản.") });
            void load();
            if (expandedId === editUserId) {
              void getAdminUser(editUserId).then((data) => setDetailItem(data.item));
            }
          }}
        />
      ) : null}

      {fullDetailUserId ? (
        <AdminUserFullDetailModal userId={fullDetailUserId} onClose={() => setFullDetailUserId(null)} />
      ) : null}
    </div>
  );
}

function AdminAccountDetail({
  item,
  loading,
  formatDate,
  onOpenFullDetail,
}: {
  item: AdminUserItem;
  loading: boolean;
  formatDate: (value: string) => string;
  onOpenFullDetail: () => void;
}) {
  if (loading) {
    return <p className="admin-detail__loading">Đang tải chi tiết…</p>;
  }

  return (
    <div className="admin-detail admin-detail--account">
      <dl className="admin-detail__grid">
        <div>
          <dt>ID</dt>
          <dd>{item.userId}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{item.email}</dd>
        </div>
        <div>
          <dt>Vai trò</dt>
          <dd>{roleLabel(item.role)}</dd>
        </div>
        <div>
          <dt>Trạng thái hệ thống</dt>
          <dd>{item.status}</dd>
        </div>
        <div>
          <dt>Ngày tạo</dt>
          <dd>{item.createdAt ? formatDate(item.createdAt) : "—"}</dd>
        </div>
        <div>
          <dt>Cập nhật</dt>
          <dd>{item.updatedAt ? formatDate(item.updatedAt) : "—"}</dd>
        </div>
        <div>
          <dt>Tự tạm khóa</dt>
          <dd>{item.deactivatedAt ? formatDate(item.deactivatedAt) : "Không"}</dd>
        </div>
        <div>
          <dt>Khu vực</dt>
          <dd>{item.districtCity || "—"}</dd>
        </div>
        <div className="admin-detail__full">
          <dt>Giới thiệu</dt>
          <dd>{item.bio?.trim() || "—"}</dd>
        </div>
        <div>
          <dt>Gửi KYC</dt>
          <dd>{item.submittedForReviewAt ? formatDate(item.submittedForReviewAt) : "Chưa gửi"}</dd>
        </div>
        <div>
          <dt>Duyệt KYC</dt>
          <dd>{item.adminReviewStatus || "—"}</dd>
        </div>
        <div className="admin-detail__full">
          <dt>Ghi chú duyệt</dt>
          <dd>{item.adminReviewNote?.trim() || "—"}</dd>
        </div>
      </dl>
      <div className="admin-detail__actions">
        <button type="button" className="admin-btn admin-btn--primary" onClick={onOpenFullDetail}>
          Chi tiết thông tin
        </button>
      </div>
    </div>
  );
}
