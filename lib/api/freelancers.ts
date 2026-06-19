import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

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
};

export type FreelancerProfilePayload = {
  freelancer: FreelancerDetail;
  featuredService?: {
    id: string;
    title: string;
    description: string | null;
    price: string | number;
    category: string | null;
    thumbnail_url: string | null;
  } | null;
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
  );
  return data;
}
