"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationPanel from "./NotificationPanel";
import "./notifications.css";

export default function NotificationBell() {
  const { t } = useTranslation();

  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    loadNotifications,
    refreshUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    deleteRead,
  } = useNotifications({ enabled: true });

  const closePanel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closePanel]);

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={rootRef} className="notif-bell relative">
      <button
        type="button"
        className="notif-bell__btn"
        aria-label={`${t("Thông báo")}${unreadCount > 0 ? `, ${unreadCount} ${t("chưa đọc")}` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
      >
        <FaBell className="text-lg" aria-hidden />
        {unreadCount > 0 ? (
          <span className="notif-bell__badge" aria-hidden>
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationPanel
          open={open}
          onClose={closePanel}
          notifications={notifications}
          unreadCount={unreadCount}
          total={total}
          loading={loading}
          error={error}
          onLoad={loadNotifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onDelete={deleteNotification}
          onDeleteRead={deleteRead}
        />
      ) : null}
    </div>
  );
}
