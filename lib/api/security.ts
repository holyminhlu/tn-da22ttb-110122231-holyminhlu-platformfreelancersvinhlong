import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("vlc_refresh_token")?.trim() || null;
}

export type SecurityOverview = {
  auth: {
    isGoogleAccount: boolean;
    hasLocalPassword: boolean;
    isGoogleOnly: boolean;
    loginAlertsEnabled: boolean;
    isDeactivated: boolean;
  };
  recovery: {
    loginEmail: string;
    profilePhone: string | null;
    recoveryEmail: string | null;
    recoveryPhone: string | null;
  };
  linkedAccounts: Array<{
    provider: string;
    label: string;
    linked: boolean;
    email: string | null;
  }>;
  activeSessions: number;
  features: {
    totp2fa: boolean;
    passkey: boolean;
    backupCodes: boolean;
  };
};

export type SecuritySession = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string;
  browser: string;
  os: string;
  deviceType: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type LoginHistoryEntry = {
  id: string;
  success: boolean;
  ipAddress: string | null;
  deviceLabel: string;
  at: string;
};

export async function getSecurityOverview() {
  const { data } = await fetchApi<SecurityOverview>(apiPaths.users.security, { auth: true });
  return data;
}

export async function listSecuritySessions() {
  const refreshToken = getStoredRefreshToken();
  const qs = refreshToken ? `?currentRefreshToken=${encodeURIComponent(refreshToken)}` : "";
  const { data } = await fetchApi<{ items: SecuritySession[] }>(
    `${apiPaths.users.securitySessions}${qs}`,
    { auth: true },
  );
  return data;
}

export async function revokeSecuritySession(sessionId: string) {
  const refreshToken = getStoredRefreshToken();
  const { data } = await fetchApi<{ message: string }>(apiPaths.users.securitySession(sessionId), {
    method: "DELETE",
    auth: true,
    body: refreshToken ? { currentRefreshToken: refreshToken } : undefined,
  });
  return data;
}

export async function revokeOtherSecuritySessions() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw { status: 400, message: "Không tìm thấy phiên hiện tại." };
  }
  const { data } = await fetchApi<{ message: string }>(apiPaths.users.securityRevokeOthers, {
    method: "POST",
    auth: true,
    body: { currentRefreshToken: refreshToken },
  });
  return data;
}

export async function listLoginHistory(limit = 30) {
  const { data } = await fetchApi<{ items: LoginHistoryEntry[] }>(
    `${apiPaths.users.securityLoginHistory}?limit=${limit}`,
    { auth: true },
  );
  return data;
}

export async function updateRecoverySettings(payload: {
  recoveryEmail?: string;
  recoveryPhone?: string;
  loginAlertsEnabled?: boolean;
}) {
  const { data } = await fetchApi<{
    message: string;
    recovery: SecurityOverview["recovery"];
    auth: SecurityOverview["auth"];
  }>(apiPaths.users.securityRecovery, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
  return data;
}

export async function deactivateAccount(payload: { currentPassword?: string; confirm: string }) {
  const { data } = await fetchApi<{ message: string; requireLogout?: boolean }>(
    apiPaths.users.securityDeactivate,
    {
      method: "POST",
      auth: true,
      body: payload,
    },
  );
  return data;
}

export async function deleteAccount(payload: { currentPassword?: string; confirm: string }) {
  const { data } = await fetchApi<{ message: string; requireLogout?: boolean }>(
    apiPaths.users.securityDeleteAccount,
    {
      method: "DELETE",
      auth: true,
      body: payload,
    },
  );
  return data;
}
