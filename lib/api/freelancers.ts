import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";
import { fetchApi } from "./client";
import type { ExclusiveResourceItem, ProfileFileItem } from "./users";

export type FreelancerSearchRow = {
  id: string;
  full_name: string;
  title: string;
  bio: string;
  avatar_url: string | null;
  district_city: string;
  city?: string;
  state_province?: string;
  country?: string;
  location_label: string;
  hourly_rate: string | number | null;
  total_earnings: string | number | null;
  experience_years: number | null;
  avg_response_minutes: number | null;
  job_success_score: number | null;
  profile_badges: unknown;
  rating_avg: number;
  total_reviews: number;
  completed_jobs: number;
  skills: string[];
  services_count: number;
  portfolio_count: number;
  featured_service_id: string | null;
  featured_service_title: string | null;
  featured_service_description: string | null;
  featured_service_category: string | null;
  featured_service_price: string | number | null;
  featured_service_min_package: string | number | null;
  featured_service_thumbnail: string | null;
  has_demo_video: boolean;
  favorite_count: number;
};

/** @deprecated — dùng FreelancerSearchRow */
export type FreelancerListRow = FreelancerSearchRow;

export type FreelancersListResponse = {
  freelancers: FreelancerSearchRow[];
  total: number;
  limit: number;
  offset: number;
  servicesTotal?: number;
  filters?: {
    skills: string[];
    districts: string[];
    categories: string[];
  };
};

export type FreelancerDetail = FreelancerSearchRow & {
  tagline?: string;
  languages?: unknown;
};

export type FreelancerServiceItem = {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
  delivery_days: number | null;
  category: string | null;
  thumbnail_url?: string | null;
  response_time_hours?: number | null;
  media_urls?: unknown;
  demo_media?: unknown;
  packages?: unknown;
  faqs?: unknown;
  tech_stack?: unknown;
  requirements?: string | null;
  support_upsell?: string | null;
};

export type ProfileAssetsAccess = "none" | "locked" | "granted";

export type FreelancerProfilePayload = {
  freelancer: FreelancerDetail;
  featuredService?: FreelancerServiceItem | null;
  services: FreelancerServiceItem[];
  portfolio: {
    id: string;
    title: string;
    description: string | null;
    project_url: string | null;
    images: unknown;
    created_at?: string;
  }[];
  reviews: { id: string; rating: number; comment: string | null; created_at: string; client_name: string | null }[];
  exclusiveResources?: ExclusiveResourceItem[];
  profileFiles?: ProfileFileItem[];
  profileAssetsAccess?: ProfileAssetsAccess;
};

export type TopSkillRow = {
  name: string;
  freelancerCount: number;
};

export type TopSkillsResponse = {
  skills: TopSkillRow[];
};

export type TopLocationRow = {
  name: string;
  freelancerCount: number;
};

export type TopLocationsResponse = {
  locations: TopLocationRow[];
};

export async function getTopSkills(limit = 9) {
  const search = new URLSearchParams();
  if (limit != null) search.set("limit", String(limit));
  const qs = search.toString();
  const path = qs ? `${apiPaths.freelancers.topSkills}?${qs}` : apiPaths.freelancers.topSkills;
  const { data } = await fetchApi<TopSkillsResponse>(path);
  return data;
}

export async function getTopLocations(limit = 16) {
  const search = new URLSearchParams();
  if (limit != null) search.set("limit", String(limit));
  const qs = search.toString();
  const path = qs ? `${apiPaths.freelancers.topLocations}?${qs}` : apiPaths.freelancers.topLocations;
  const { data } = await fetchApi<TopLocationsResponse>(path);
  return data;
}

export async function listFreelancers(params?: {
  q?: string;
  skill?: string;
  district?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.skill) search.set("skill", params.skill);
  if (params?.district) search.set("district", params.district);
  if (params?.category) search.set("category", params.category);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  const path = qs ? `${apiPaths.freelancers.list}?${qs}` : apiPaths.freelancers.list;
  const { data } = await fetchApi<FreelancersListResponse>(path);
  return data;
}

export async function getFreelancer(freelancerId: string, serviceId?: string) {
  const qs = serviceId ? `?service=${encodeURIComponent(serviceId)}` : "";
  const { data } = await fetchApi<FreelancerProfilePayload>(
    `${apiPaths.freelancers.detail(freelancerId)}${qs}`,
    { auth: true },
  );
  return data;
}

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("vlc_access_token")?.trim() || null;
}

export async function downloadFreelancerProtectedAsset(apiPath: string, fileName?: string) {
  const token = getStoredAccessToken();
  const response = await fetch(apiUrl(apiPath, getApiBaseUrl()), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: string }).message)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "download";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
