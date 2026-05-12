/** Client-side auth helpers: access tokens expire quickly; refresh prolongs the session. */

import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

export { getApiBaseUrl };

export function clearVlcAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("vlc_current_user");
  window.localStorage.removeItem("vlc_access_token");
  window.localStorage.removeItem("vlc_refresh_token");
}

type RefreshResponse = {
  message?: string;
  tokens?: { accessToken?: string; refreshToken?: string };
};

/**
 * POST /api/auth/refresh — updates vlc_access_token (and refresh if server rotates it).
 */
export async function refreshAccessToken(apiBaseUrl = getApiBaseUrl()): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = window.localStorage.getItem("vlc_refresh_token");
  if (!refreshToken) return null;

  try {
    const res = await fetch(apiUrl(apiPaths.auth.refresh, apiBaseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = (await res.json()) as RefreshResponse;
    if (!res.ok || !data.tokens?.accessToken) return null;
    window.localStorage.setItem("vlc_access_token", data.tokens.accessToken);
    if (data.tokens.refreshToken) {
      window.localStorage.setItem("vlc_refresh_token", data.tokens.refreshToken);
    }
    return data.tokens.accessToken;
  } catch {
    return null;
  }
}

/**
 * Adds Bearer token; if missing tries refresh. On 401, refreshes once and retries the same request.
 */
export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}, apiBaseUrl = getApiBaseUrl()): Promise<Response> {
  if (typeof window === "undefined") {
    return fetch(input, init);
  }

  const headers = new Headers(init.headers ?? undefined);
  let token = window.localStorage.getItem("vlc_access_token");
  if (!token) {
    token = await refreshAccessToken(apiBaseUrl);
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    const next = await refreshAccessToken(apiBaseUrl);
    if (next) {
      headers.set("Authorization", `Bearer ${next}`);
      response = await fetch(input, { ...init, headers });
    }
  }

  return response;
}
