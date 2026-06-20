import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "@/lib/userPreferences";

export type NotificationPreferencesResponse = {
  preferences: NotificationPrefs;
};

function normalizeResponse(payload: Partial<NotificationPreferencesResponse> | null | undefined) {
  return {
    preferences: {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(payload?.preferences ?? {}),
    },
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  const { data } = await fetchApi<NotificationPreferencesResponse>(
    apiPaths.users.notificationPreferences,
    { auth: true },
  );
  return normalizeResponse(data);
}

export async function updateNotificationPreferences(
  preferences: NotificationPrefs,
): Promise<NotificationPreferencesResponse & { message: string }> {
  const { data } = await fetchApi<NotificationPreferencesResponse & { message: string }>(
    apiPaths.users.notificationPreferences,
    {
      method: "PATCH",
      auth: true,
      body: preferences,
    },
  );
  return {
    message: data.message ?? "Đã lưu cài đặt thông báo.",
    ...normalizeResponse(data),
  };
}
