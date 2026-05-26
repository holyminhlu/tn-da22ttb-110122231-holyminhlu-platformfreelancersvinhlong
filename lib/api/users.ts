import { apiPaths } from "@/config/api.config";
import type { AuthUser } from "@/lib/api/auth";
import { fetchApi } from "./client";

export type UserSkill = {
  id: number;
  name: string;
  level: string | null;
  years_of_experience: number;
};

export type FreelancerProfile = {
  title: string | null;
  hourly_rate: string | number | null;
  experience_years: number | null;
  availability_status: string;
  total_earnings: string | number | null;
  job_success_score: number | null;
  avg_response_minutes: number | null;
  profile_badges: string[] | unknown;
  rating_avg: string | number;
  total_reviews: number;
  languages: string[] | unknown;
  services_count: number;
};

export type FreelancerService = {
  id: string;
  title: string;
  description: string | null;
  price: string | number;
  delivery_days: number | null;
  demo_media: unknown;
  thumbnail_url: string | null;
  created_at: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  project_url: string | null;
  images: unknown;
  created_at: string;
};

export type ContractReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
};

export type FeedbackReview = ContractReview & {
  contract_id: string;
  job_id: string;
  job_title: string | null;
  contract_status: string;
  contract_end: string | null;
};

export type MyFeedbackResponse = {
  role: "freelancer" | "client";
  reviews: FeedbackReview[];
};

export type MeUser = AuthUser & {
  status?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bio?: string | null;
  website?: string | null;
  tagline?: string | null;
  districtCity?: string | null;
  locationWkt?: string | null;
};

export type FreelancerMeResponse = {
  user: MeUser;
  completionScore: number;
  skills: UserSkill[];
  freelancerProfile: FreelancerProfile | null;
  services: FreelancerService[];
  portfolio: PortfolioItem[];
  reviews: ContractReview[];
  timeline?: { event_type: string; event_time: string; event_title: string }[];
};

type ClientMeResponse = {
  user: MeUser;
  completionScore?: number;
};

export type UpdateProfilePayload = {
  fullName: string;
  phone?: string | null;
  bio?: string | null;
  website?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  tagline?: string | null;
  districtCity?: string | null;
  title?: string | null;
  hourlyRate?: number | null;
  experienceYears?: number | null;
  availabilityStatus?: string | null;
};

export async function getMe() {
  const { data } = await fetchApi<ClientMeResponse | FreelancerMeResponse>(apiPaths.users.me, {
    auth: true,
  });
  return data;
}

export async function listMyFeedback() {
  const { data } = await fetchApi<MyFeedbackResponse>(apiPaths.users.feedback, { auth: true });
  return data;
}

export type ProfileStatsPeriod = "30d" | "last_year" | "all";

export type ProfileStatsViewPoint = {
  date: string;
  views: number;
};

export type ProfileStatsServiceRow = {
  id: string;
  title: string;
  views: number;
  conversions: number;
  conversion_rate: number;
};

export type ProfileStatsPortfolioRow = {
  id: string;
  title: string;
  views: number;
};

export type ProfileStatsResponse = {
  period: ProfileStatsPeriod;
  period_label: string;
  profile_views: {
    total: number;
    series: ProfileStatsViewPoint[];
    summary: string;
  };
  conversion: {
    work_invitations: number;
    website_clicks: number;
  };
  services: ProfileStatsServiceRow[];
  portfolio: ProfileStatsPortfolioRow[];
  marketing: {
    tms: number;
    car: number;
    cer: number;
    crr: number;
    website_clicks: number;
  };
};

export async function getProfileStats(period: ProfileStatsPeriod = "30d") {
  const search = new URLSearchParams({ period });
  const { data } = await fetchApi<ProfileStatsResponse>(
    `${apiPaths.users.profileStats}?${search.toString()}`,
    { auth: true },
  );
  return data;
}

export async function changeEmail(newEmail: string, currentPassword: string) {
  const { data } = await fetchApi<{ message?: string; email?: string; requireReLogin?: boolean }>(
    apiPaths.users.changeEmail,
    { method: "PATCH", auth: true, body: { newEmail, currentPassword } },
  );
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await fetchApi<{ message?: string; requireReLogin?: boolean }>(
    apiPaths.users.changePassword,
    { method: "PATCH", auth: true, body: { currentPassword, newPassword } },
  );
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const { data } = await fetchApi<{ message?: string }>(apiPaths.users.profile, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
  return data;
}

export type SkillInput = {
  name: string;
  level?: string;
  yearsOfExperience?: number;
};

export type CreatePortfolioPayload = {
  title: string;
  description?: string;
  projectUrl?: string;
  images?: string[];
};

export async function updateSkills(skills: SkillInput[]) {
  const { data } = await fetchApi<{ message?: string }>(apiPaths.users.skills, {
    method: "PUT",
    auth: true,
    body: { skills },
  });
  return data;
}

export async function createPortfolio(payload: CreatePortfolioPayload) {
  const { data } = await fetchApi<{ message?: string; portfolio?: PortfolioItem }>(
    apiPaths.users.portfolio,
    {
      method: "POST",
      auth: true,
      body: payload,
    },
  );
  return data;
}

export function isFreelancerMeResponse(data: ClientMeResponse | FreelancerMeResponse): data is FreelancerMeResponse {
  return "freelancerProfile" in data || "services" in data;
}
