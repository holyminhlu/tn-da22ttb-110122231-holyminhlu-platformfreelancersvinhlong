/**
 * Cấu hình gọi REST backend — một nguồn cho base URL và đường dẫn endpoint.
 */

export const DEFAULT_API_BASE_URL = "http://localhost:5000";

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  return (typeof raw === "string" && raw.trim() !== "" ? raw.trim() : DEFAULT_API_BASE_URL);
}

export function normalizeApiBase(base: string): string {
  return base.replace(/\/+$/, "");
}

/** URL tuyệt đối tới backend: `base` + `path` (path luôn bắt đầu bằng `/`). */
export function apiUrl(path: string, base: string = getApiBaseUrl()): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeApiBase(base)}${normalizedPath}`;
}

/** Đường dẫn tương đối (prefix `/api/...`) — ghép với base qua `apiUrl`. */
export const apiPaths = {
  auth: {
    google: "/api/auth/google",
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    refresh: "/api/auth/refresh",
    freelancers: "/api/auth/freelancers",
    me: "/api/auth/me",
    meAvatar: "/api/auth/me/avatar",
    meContracts: "/api/auth/me/contracts",
    meContract: (contractId: string) => `/api/auth/me/contracts/${contractId}`,
    meContractReview: (contractId: string) => `/api/auth/me/contracts/${contractId}/review`,
    meMyWork: "/api/auth/me/my-work",
    meJobImages: "/api/auth/me/job-images",
    meJob: "/api/auth/me/job",
    meJobsAccept: (jobId: string) => `/api/auth/me/jobs/${jobId}/accept`,
    meService: "/api/auth/me/service",
    meProfile: "/api/auth/me/profile",
    meSkills: "/api/auth/me/skills",
    mePortfolio: "/api/auth/me/portfolio",
  },
  jobs: {
    list: "/api/jobs",
    detail: (jobId: string) => `/api/jobs/${jobId}`,
  },
  services: {
    list: "/api/services",
    detail: (serviceId: string) => `/api/services/${serviceId}`,
  },
} as const;
