"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaSearch, FaTimes } from "react-icons/fa";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import "@/components/dashboard/dashboardPagination.css";
import type { AppNotification } from "@/lib/api/notifications";
import { getNotificationCategoryMeta } from "@/lib/notifications/display";
import { resolveNotificationHref } from "@/lib/notifications/navigation";
import { useStoredUser } from "@/hooks/useStoredUser";
import "./notifications.css";

const PAGE_SIZE = 10;

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  total: number;
  loading: boolean;
  error: string | null;
  onLoad: (params: {
    q?: string;
    category?: string;
    read?: "all" | "unread" | "read";
    limit?: number;
    offset?: number;
  }) => void;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteRead: () => Promise<void>;
};

const CATEGORY_OPTIONS = [
  { id: "all", label: "Tất cả" },
  { id: "quote", label: "Báo giá" },
  { id: "order", label: "Đơn hàng" },
  { id: "message", label: "Tin nhắn" },
  { id: "review", label: "Đánh giá" },
  { id: "system", label: "Hệ thống" },
] as const;

const READ_OPTIONS = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "read", label: "Đã đọc" },
] as const;

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export default function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  total,
  loading,
  error,
  onLoad,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onDeleteRead,
}: NotificationPanelProps) {
  const { t } = useTranslation();

  const router = useRouter();
  const { user } = useStoredUser({ refreshFromApi: false });
  const viewerRole = (() => {
    const role = String(user?.role || "").toLowerCase();
    if (role === "client" || role === "freelancer" || role === "admin") return role;
    return null;
  })();
  const panelId = useId();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const lastFiltersRef = useRef({ search, category, readFilter });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchList = useCallback(
    (q: string, cat: string, read: "all" | "unread" | "read", pageNum: number) => {
      onLoad({
        q: q.trim() || undefined,
        category: cat,
        read,
        limit: PAGE_SIZE,
        offset: (pageNum - 1) * PAGE_SIZE,
      });
    },
    [onLoad],
  );

  useEffect(() => {
    if (!open) return;

    const filtersChanged =
      lastFiltersRef.current.search !== search ||
      lastFiltersRef.current.category !== category ||
      lastFiltersRef.current.readFilter !== readFilter;

    if (filtersChanged) {
      lastFiltersRef.current = { search, category, readFilter };
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const delay = search.trim() ? 300 : 0;
    searchTimerRef.current = setTimeout(() => {
      fetchList(search, category, readFilter, page);
    }, delay);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, open, category, readFilter, page, fetchList]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleItemClick(notification: AppNotification) {
  const t = tUi;
    if (!notification.readAt) {
      await onMarkRead(notification.id);
    }
    onClose();
    const nextHref = resolveNotificationHref(notification, viewerRole);
    if (nextHref) {
      router.push(nextHref);
    }
  }

  async function handleDelete(notificationId: string) {
  const t = tUi;
  await onDelete(notificationId);
    if (notifications.length <= 1 && page > 1) {
      setPage((p) => p - 1);
      return;
    }
    fetchList(search, category, readFilter, page);
  }

  return (
    <div
      id={panelId}
      role="dialog"
      aria-label={t("Thông báo")}
      className="notif-panel"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="notif-panel__header">
        <div>
          <h2 className="notif-panel__title">{t("Thông báo")}</h2>
          {unreadCount > 0 ? (
            <p className="notif-panel__subtitle">{unreadCount} chưa đọc</p>
          ) : null}
        </div>
        <button
          type="button"
          className="notif-panel__close"
          aria-label={t("Đóng")}
          onClick={onClose}
        >
          <FaTimes aria-hidden />
        </button>
      </div>

      <div className="notif-panel__toolbar">
        <div className="notif-panel__search-wrap">
          <FaSearch className="notif-panel__search-icon" aria-hidden />
          <input
            type="search"
            className="notif-panel__search"
            placeholder={t("Tìm kiếm thông báo...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("Tìm kiếm thông báo")}
          />
        </div>
        <div className="notif-panel__filters" role="group" aria-label={t("Lọc theo loại")}>
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`notif-panel__chip ${category === opt.id ? "notif-panel__chip--active" : ""}`}
              onClick={() => setCategory(opt.id)}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
        <div className="notif-panel__filters" role="group" aria-label={t("Lọc theo trạng thái đọc")}>
          {READ_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`notif-panel__chip ${readFilter === opt.id ? "notif-panel__chip--active" : ""}`}
              onClick={() => setReadFilter(opt.id)}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="notif-panel__actions">
        <button
          type="button"
          className="notif-panel__action-btn"
          disabled={unreadCount === 0}
          onClick={() => void onMarkAllRead()}
        >
          {t("Đọc tất cả")}
        </button>
        <button
          type="button"
          className="notif-panel__action-btn"
          onClick={() => void onDeleteRead()}
        >
          {t("Xóa đã đọc")}
        </button>
        <span className="notif-panel__count">{total} kết quả</span>
      </div>

      <div className="notif-panel__list" aria-live="polite">
        {loading && notifications.length === 0 ? (
          <p className="notif-panel__empty">{t("Đang tải...")}</p>
        ) : error ? (
          <p className="notif-panel__empty notif-panel__empty--error">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="notif-panel__empty">{t("Không có thông báo nào.")}</p>
        ) : (
          notifications.map((notification) => {
            const meta = getNotificationCategoryMeta(notification.category);
            const Icon = meta.Icon;
            const isUnread = !notification.readAt;

            return (
              <div
                key={notification.id}
                className={`notif-item notif-item--${meta.tone}${isUnread ? " notif-item--unread" : ""}`}
              >
                <div className={`notif-item__icon notif-item__icon--${meta.tone}`} aria-hidden>
                  <Icon className="notif-item__icon-svg" />
                  <span className={`notif-item__dot notif-item__dot--${meta.tone}`} />
                </div>
                <button
                  type="button"
                  className="notif-item__body"
                  onClick={() => void handleItemClick(notification)}
                >
                  <div className="notif-item__head">
                    <p className="notif-item__title">{t(notification.title)}</p>
                    <span className={`notif-item__tag notif-item__tag--${meta.tone}`}>
                      {t(meta.label)}
                    </span>
                  </div>
                  <p className="notif-item__text">{notification.body}</p>
                  <p className="notif-item__meta">{formatRelativeTime(notification.createdAt)}</p>
                </button>
                <button
                  type="button"
                  className="notif-item__delete"
                  aria-label={t("Xóa thông báo")}
                  onClick={() => void handleDelete(notification.id)}
                >
                  <FaTimes aria-hidden className="notif-item__delete-icon" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <DashboardPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        className="notif-panel__pagination"
      />
    </div>
  );
}
