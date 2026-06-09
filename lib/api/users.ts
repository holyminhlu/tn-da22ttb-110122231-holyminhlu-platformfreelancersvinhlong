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
  completed_jobs?: number;
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

export type ExclusiveResourceItem = {
  id: string;
  title: string;
  description: string | null;
  resource_type: "link" | "file";
  link_url: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

export type ProfileFileItem = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
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
  coverUrl?: string | null;
  locationWkt?: string | null;
  completedJobs?: number;
};

export type FreelancerMeResponse = {
  user: MeUser;
  completionScore: number;
  skills: UserSkill[];
  freelancerProfile: FreelancerProfile | null;
  services: FreelancerService[];
  portfolio: PortfolioItem[];
  exclusiveResources?: ExclusiveResourceItem[];
  profileFiles?: ProfileFileItem[];
  reviews: ContractReview[];
  timeline?: { event_type: string; event_time: string; event_title: string }[];
};

export type ClientStats = {
  total_jobs: number | string;
  open_jobs: number | string;
  total_contracts: number | string;
};

export type ClientRecentJob = {
  id: string;
  title: string;
  budget: string | number | null;
  status: string;
  created_at: string;
};

export type ClientAccountBalance = {
  balance: number;
  escrowBalance: number;
};

export type ClientRecentPayment = {
  id: string;
  job_id: string | null;
  service_id: string | null;
  title: string;
  amount: string | number | null;
  paid_at: string;
  freelancer_name: string | null;
  escrow_status: string | null;
};

export type ClientMeResponse = {
  user: MeUser;
  completionScore?: number;
  skills: UserSkill[];
  clientStats: ClientStats;
  recentJobs: ClientRecentJob[];
  reviews: ContractReview[];
  timeline?: { event_type: string; event_time: string; event_title: string }[];
  account?: ClientAccountBalance;
  recentPayments?: ClientRecentPayment[];
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
  coverUrl?: string | null;
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

export async function updateAvatar(avatarUrl: string) {
  const { data } = await fetchApi<{ message?: string; avatarUrl?: string }>(apiPaths.users.avatar, {
    method: "PATCH",
    auth: true,
    body: { avatarUrl },
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

export type CreateExclusiveResourcePayload = {
  title: string;
  description?: string;
  resourceType: "link" | "file";
  linkUrl?: string;
  fileUrl?: string;
  fileName?: string;
};

export type CreateProfileFilePayload = {
  title: string;
  description?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

export type ProfileFileUploadResult = {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
};

export async function uploadProfileFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await fetchApi<ProfileFileUploadResult>(apiPaths.users.profileFileUpload, {
    method: "POST",
    auth: true,
    body: form,
  });
  return data;
}

export async function createExclusiveResource(payload: CreateExclusiveResourcePayload) {
  const { data } = await fetchApi<{ message?: string; resource?: ExclusiveResourceItem }>(
    apiPaths.users.exclusiveResources,
    { method: "POST", auth: true, body: payload },
  );
  return data;
}

export async function createProfileFile(payload: CreateProfileFilePayload) {
  const { data } = await fetchApi<{ message?: string; file?: ProfileFileItem }>(
    apiPaths.users.profileFiles,
    { method: "POST", auth: true, body: payload },
  );
  return data;
}

export function isFreelancerMeResponse(data: ClientMeResponse | FreelancerMeResponse): data is FreelancerMeResponse {
  return "freelancerProfile" in data || "services" in data;
}

export function isClientMeResponse(data: ClientMeResponse | FreelancerMeResponse): data is ClientMeResponse {
  return "clientStats" in data;
}
