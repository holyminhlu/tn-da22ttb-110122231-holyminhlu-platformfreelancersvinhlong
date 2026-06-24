import { apiUrl, getApiBaseUrl } from "@/config/api.config";
import { disconnectChatSocket } from "@/lib/chat/socketClient";
import type { AuthUser } from "@/lib/api/auth";

export const VLC_USER_STORAGE_KEY = "vlc_current_user";
export const VLC_USER_UPDATED_EVENT = "vlc-user-updated";

export type StoredUser = {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  avatarUrl?: string;
  completedJobs?: number;
};

export function toStoredUser(user: AuthUser): StoredUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName || "",
    avatarUrl: user.avatarUrl?.trim() || "",
    completedJobs: user.completedJobs ?? 0,
  };
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(VLC_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredUser;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistStoredUser(user: StoredUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VLC_USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(VLC_USER_UPDATED_EVENT));
}

export function persistAuthTokens(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
}): void {
  if (typeof window === "undefined") return;
  if (tokens.accessToken) {
    window.localStorage.setItem("vlc_access_token", tokens.accessToken);
  }
  if (tokens.refreshToken) {
    window.localStorage.setItem("vlc_refresh_token", tokens.refreshToken);
  }
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  disconnectChatSocket();
  window.localStorage.removeItem(VLC_USER_STORAGE_KEY);
  window.localStorage.removeItem("vlc_access_token");
  window.localStorage.removeItem("vlc_refresh_token");
  window.dispatchEvent(new Event(VLC_USER_UPDATED_EVENT));
}

export function resolveAvatarSrc(url?: string | null): string | undefined {
  const trimmed = String(url || "").trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return apiUrl(path, getApiBaseUrl());
}

export function getUserInitials(fullName?: string | null, email?: string | null): string {
  const name = String(fullName || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const mail = String(email || "").trim();
  return mail ? mail.slice(0, 2).toUpperCase() : "?";
}
