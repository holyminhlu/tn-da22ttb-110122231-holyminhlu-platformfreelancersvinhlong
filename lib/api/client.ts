import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";
import { clearStoredSession, persistAuthTokens } from "@/lib/authSession";

export type ApiError = {
  status: number;
  message: string;
  code?: string;
};

export type FetchApiOptions = RequestInit & {
  /** Gửi kèm Bearer token từ localStorage (client-only). */
  auth?: boolean;
  baseUrl?: string;
  /** @internal — tránh lặp khi retry sau refresh */
  _retry?: boolean;
};

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem("vlc_access_token");
  return token?.trim() || null;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(baseUrl: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const refreshToken = window.localStorage.getItem("vlc_refresh_token")?.trim();
  if (!refreshToken) return false;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(apiUrl(apiPaths.auth.refresh, baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? ((await response.json()) as { tokens?: { accessToken?: string; refreshToken?: string } })
        : null;

      if (!response.ok || !data?.tokens?.accessToken) {
        return false;
      }

      persistAuthTokens({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken ?? refreshToken,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function fetchApi<T = unknown>(
  path: string,
  options: FetchApiOptions = {},
): Promise<{ data: T; response: Response }> {
  const { auth = false, baseUrl = getApiBaseUrl(), headers, body, _retry = false, ...rest } = options;
  const mergedHeaders = new Headers(headers);

  if (body && !(body instanceof FormData) && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getStoredAccessToken();
    if (token) mergedHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path, baseUrl), {
    ...rest,
    headers: mergedHeaders,
    body:
      body !== undefined && body !== null && typeof body === "object" && !(body instanceof FormData)
        ? JSON.stringify(body)
        : body,
  });

  let data: T;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = (await response.json()) as T;
  } else {
    data = (await response.text()) as T;
  }

  if (response.status === 401 && auth && !_retry && typeof window !== "undefined") {
    const refreshed = await refreshAccessToken(baseUrl);
    if (refreshed) {
      return fetchApi<T>(path, { ...options, _retry: true });
    }
    clearStoredSession();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: string }).message)
        : `HTTP ${response.status}`;
    const code =
      typeof data === "object" && data !== null && "code" in data
        ? String((data as { code?: string }).code || "")
        : undefined;
    const err: ApiError = { status: response.status, message, code: code || undefined };
    throw err;
  }

  return { data, response };
}
