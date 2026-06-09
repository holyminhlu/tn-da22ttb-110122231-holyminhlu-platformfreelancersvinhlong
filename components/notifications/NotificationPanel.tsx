"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaSearch, FaTimes } from "react-icons/fa";
import type { AppNotification } from "@/lib/api/notifications";
import "./notifications.css";

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
  const router = useRouter();
  const panelId = useId();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  const fetchList = useCallback(
    (q: string, cat: string, read: "all" | "unread" | "read") => {
      onLoad({
        q: q.trim() || undefined,
        category: cat,
        read,
        limit: 50,
        offset: 0,
      });
    },
    [onLoad],
  );

  useEffect(() => {
    if (!open) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const delay = search.trim() ? 300 : 0;
    searchTimerRef.current = setTimeout(() => {
      fetchList(search, category, readFilter);
    }, delay);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, open, category, readFilter, fetchList]);

  async function handleItemClick(notification: AppNotification) {
    if (!notification.readAt) {
      await onMarkRead(notification.id);
    }
    onClose();
    if (notification.href) {
      router.push(notification.href);
    }
  }

  return (
    <div
      id={panelId}
      role="dialog"
      aria-label="Thông báo"
      className="notif-panel"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="notif-panel__header">
        <div>
          <h2 className="notif-panel__title">Thông báo</h2>
          {unreadCount > 0 ? (
            <p className="text-xs text-gray-500">{unreadCount} chưa đọc</p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Đóng"
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
            placeholder="Tìm kiếm thông báo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm thông báo"
          />
        </div>
        <div className="notif-panel__filters" role="group" aria-label="Lọc theo loại">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`notif-panel__chip ${category === opt.id ? "notif-panel__chip--active" : ""}`}
              onClick={() => setCategory(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="notif-panel__filters" role="group" aria-label="Lọc theo trạng thái đọc">
          {READ_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`notif-panel__chip ${readFilter === opt.id ? "notif-panel__chip--active" : ""}`}
              onClick={() => setReadFilter(opt.id)}
            >
              {opt.label}
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
          Đọc tất cả
        </button>
        <button
          type="button"
          className="notif-panel__action-btn"
          onClick={() => void onDeleteRead()}
        >
          Xóa đã đọc
        </button>
        <span className="ml-auto text-xs text-gray-400">{total} kết quả</span>
      </div>

      <div className="notif-panel__list" aria-live="polite">
        {loading && notifications.length === 0 ? (
          <p className="notif-panel__empty">Đang tải...</p>
        ) : error ? (
          <p className="notif-panel__empty text-red-500">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="notif-panel__empty">Không có thông báo nào.</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notif-item ${notification.readAt ? "" : "notif-item--unread"}`}
            >
              <span className="notif-item__dot" aria-hidden />
              <button
                type="button"
                className="notif-item__body text-left"
                onClick={() => void handleItemClick(notification)}
              >
                <p className="notif-item__title">{notification.title}</p>
                <p className="notif-item__text">{notification.body}</p>
                <p className="notif-item__meta">{formatRelativeTime(notification.createdAt)}</p>
              </button>
              <button
                type="button"
                className="notif-item__delete"
                aria-label="Xóa thông báo"
                onClick={() => void onDelete(notification.id)}
              >
                <FaTimes aria-hidden className="text-xs" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
