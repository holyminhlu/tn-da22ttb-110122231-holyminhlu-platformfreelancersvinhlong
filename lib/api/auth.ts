import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  completedJobs?: number | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiry?: string;
  refreshExpiry?: string;
};

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  email: string;
  password: string;
  role: "client" | "freelancer";
  fullName: string;
  phone?: string;
  bio?: string;
  title?: string;
  hourlyRate?: number;
  experienceYears?: number;
  availabilityStatus?: string;
};

type AuthResponse = {
  message: string;
  user?: AuthUser;
  tokens?: AuthTokens;
};

export async function login(payload: LoginPayload) {
  const { data } = await fetchApi<AuthResponse>(apiPaths.auth.login, {
    method: "POST",
    body: payload,
  });
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await fetchApi<AuthResponse>(apiPaths.auth.register, {
    method: "POST",
    body: payload,
  });
  return data;
}

export async function logout(refreshToken: string) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.auth.logout, {
    method: "POST",
    auth: true,
    body: { refreshToken },
  });
  return data;
}

export async function refreshSession(refreshToken: string) {
  const { data } = await fetchApi<AuthResponse>(apiPaths.auth.refresh, {
    method: "POST",
    body: { refreshToken },
  });
  return data;
}

export type GoogleCompleteResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  next: string;
};

export async function completeGoogleOAuth(ticket: string) {
  const { data } = await fetchApi<GoogleCompleteResponse>(
    `${apiPaths.auth.googleComplete}?ticket=${encodeURIComponent(ticket)}`,
  );
  return data;
}
