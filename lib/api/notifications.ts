import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type NotificationCategory = "quote" | "order" | "message" | "review" | "system";

export type AppNotification = {
  id: string;
  userId: string;
  category: NotificationCategory | string;
  action: string;
  title: string;
  body: string;
  href: string | null;
  actorId: string | null;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListParams = {
  q?: string;
  category?: string;
  read?: "all" | "unread" | "read";
  limit?: number;
  offset?: number;
};

export async function listNotifications(params: NotificationListParams = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category && params.category !== "all") search.set("category", params.category);
  if (params.read && params.read !== "all") search.set("read", params.read);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));

  const qs = search.toString();
  const path = qs ? `${apiPaths.notifications.list}?${qs}` : apiPaths.notifications.list;

  const { data } = await fetchApi<{
    notifications: AppNotification[];
    total: number;
    limit: number;
    offset: number;
  }>(path, { auth: true });

  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await fetchApi<{ count: number }>(apiPaths.notifications.unreadCount, {
    auth: true,
  });
  return data.count ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const { data } = await fetchApi<{ notification: AppNotification }>(
    apiPaths.notifications.read(notificationId),
    { method: "PATCH", auth: true },
  );
  return data.notification;
}

export async function markAllNotificationsRead() {
  const { data } = await fetchApi<{ message: string; count: number }>(
    apiPaths.notifications.readAll,
    { method: "PATCH", auth: true },
  );
  return data;
}

export async function deleteNotification(notificationId: string) {
  const { data } = await fetchApi<{ message: string }>(
    apiPaths.notifications.delete(notificationId),
    { method: "DELETE", auth: true },
  );
  return data;
}

export async function deleteReadNotifications() {
  const { data } = await fetchApi<{ message: string; count: number }>(
    apiPaths.notifications.deleteRead,
    { method: "DELETE", auth: true },
  );
  return data;
}
