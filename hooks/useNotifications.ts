"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteNotification,
  deleteReadNotifications,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationListParams,
} from "@/lib/api/notifications";
import { getChatSocket } from "@/lib/chat/socketClient";

type UseNotificationsOptions = {
  enabled?: boolean;
};

export function useNotifications({ enabled = true }: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef<NotificationListParams>({ limit: 50, offset: 0 });

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const loadNotifications = useCallback(
    async (params?: NotificationListParams) => {
      if (!enabled) return;
      const merged = { ...filtersRef.current, ...params };
      filtersRef.current = merged;
      setLoading(true);
      setError(null);
      try {
        const data = await listNotifications(merged);
        setNotifications(data.notifications);
        setTotal(data.total);
        await refreshUnreadCount();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải thông báo.");
      } finally {
        setLoading(false);
      }
    },
    [enabled, refreshUnreadCount],
  );

  const handleMarkRead = useCallback(async (notificationId: string) => {
    try {
      const updated = await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, readAt: updated.readAt } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDelete = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === notificationId);
        if (removed && !removed.readAt) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      /* ignore */
    }
  }, []);

  const handleDeleteRead = useCallback(async () => {
    try {
      await deleteReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.readAt));
      await loadNotifications();
    } catch {
      /* ignore */
    }
  }, [loadNotifications]);

  useEffect(() => {
    if (!enabled) return;
    void refreshUnreadCount();
  }, [enabled, refreshUnreadCount]);

  useEffect(() => {
    if (!enabled) return;

    const socket = getChatSocket();
    if (!socket) return;

    function onNewNotification(notification: AppNotification) {
      setUnreadCount((c) => c + 1);
      const currentFilters = filtersRef.current;
      const readFilter = currentFilters.read || "all";
      const categoryFilter = currentFilters.category || "all";
      const q = (currentFilters.q || "").trim().toLowerCase();

      const matchesRead =
        readFilter === "all" ||
        (readFilter === "unread" && !notification.readAt) ||
        (readFilter === "read" && notification.readAt);

      const matchesCategory =
        categoryFilter === "all" || notification.category === categoryFilter;

      const matchesSearch =
        !q ||
        notification.title.toLowerCase().includes(q) ||
        notification.body.toLowerCase().includes(q);

      if (matchesRead && matchesCategory && matchesSearch) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
        setTotal((t) => t + 1);
      }
    }

    socket.on("notification:new", onNewNotification);
    return () => {
      socket.off("notification:new", onNewNotification);
    };
  }, [enabled]);

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    loadNotifications,
    refreshUnreadCount,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
    deleteNotification: handleDelete,
    deleteRead: handleDeleteRead,
  };
}
