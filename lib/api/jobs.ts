import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type JobListing = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  budget: string | number | null;
  budget_type?: string;
  budget_max?: string | number | null;
  status: string;
  created_at: string;
  updated_at: string;
  images: unknown;
  due_at: string | null;
  location_label: string | null;
  location_lat: number | null;
  location_lng: number | null;
  category: string | null;
  tags: unknown;
  client_name: string | null;
  client_avatar_url: string | null;
  client_district_city: string | null;
  client_country?: string | null;
  client_total_spent?: number;
  client_satisfaction_score?: number | null;
  client_email_verified: boolean;
  proposal_count: number;
  quote_count?: number;
  has_my_pending_quote?: boolean;
  my_contract_id?: string | null;
  my_contract_status?: string | null;
  my_quote_status?: string | null;
};

export type JobSort =
  | "newest"
  | "budget_asc"
  | "budget_desc"
  | "proposals_asc"
  | "proposals_desc";

export type ListJobsResponse = {
  jobs: JobListing[];
  total: number;
  limit: number;
  offset: number;
};

export type JobCategoryOption = {
  name: string;
  job_count?: number;
};

export type JobCategoryRow = { name: string; job_count?: number };

export type ListJobsParams = {
  limit?: number;
  offset?: number;
  q?: string;
  category?: string;
  location?: string;
  verified?: boolean;
  has_location?: boolean;
  has_due?: boolean;
  budget_min?: number;
  budget_max?: number;
  sort?: JobSort;
};

function appendListJobsParams(search: URLSearchParams, params?: ListJobsParams) {
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = params?.q?.trim();
  if (q) search.set("q", q);
  const category = params?.category?.trim();
  if (category) search.set("category", category);
  const location = params?.location?.trim();
  if (location) search.set("location", location);
  if (params?.verified) search.set("verified", "1");
  if (params?.has_location) search.set("has_location", "1");
  if (params?.has_due) search.set("has_due", "1");
  if (params?.budget_min != null && Number.isFinite(params.budget_min)) {
    search.set("budget_min", String(params.budget_min));
  }
  if (params?.budget_max != null && Number.isFinite(params.budget_max)) {
    search.set("budget_max", String(params.budget_max));
  }
  if (params?.sort) search.set("sort", params.sort);
}

export type ListMyJobsParams = {
  limit?: number;
  offset?: number;
  q?: string;
  status?: string;
};

export async function listMyJobs(params?: ListMyJobsParams) {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.status?.trim()) search.set("status", params.status.trim());
  const qs = search.toString();
  const path = qs ? `${apiPaths.jobs.myList}?${qs}` : apiPaths.jobs.myList;
  const { data } = await fetchApi<ListJobsResponse>(path, { auth: true });
  return data;
}

export async function listJobs(params?: ListJobsParams, options?: { auth?: boolean }) {
  const search = new URLSearchParams();
  appendListJobsParams(search, params);
  const qs = search.toString();
  const path = qs ? `${apiPaths.jobs.list}?${qs}` : apiPaths.jobs.list;
  const { data } = await fetchApi<ListJobsResponse>(path, { auth: options?.auth });
  return data;
}

export async function listJobCategories() {
  const { data } = await fetchApi<{ categories: JobCategoryRow[] }>(apiPaths.jobs.categories);
  return data.categories ?? [];
}

export async function getJob(jobId: string) {
  const { data } = await fetchApi<{ job: JobListing }>(apiPaths.jobs.detail(jobId), {
    auth: true,
  });
  return data.job;
}

export type SubmitJobQuotePayload = {
  message?: string;
  amount?: number | null;
  pricing_type?: "fixed" | "hourly";
};

export async function acceptJob(
  jobId: string,
  payload?: SubmitJobQuotePayload,
) {
  const { data } = await fetchApi<{ message?: string; quote?: { id: string } }>(
    apiPaths.jobs.accept(jobId),
    {
      method: "POST",
      auth: true,
      body: payload ?? {},
    },
  );
  return data;
}

export type CreateJobPayload = {
  title: string;
  description: string;
  budget?: number | null;
  budget_type?: "fixed" | "hourly";
  budget_max?: number | null;
  due_at?: string | null;
  location_label: string;
  location_lat?: number | null;
  location_lng?: number | null;
  category?: string | null;
  tags?: string[];
  images?: string[];
};

export type CreatedJob = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export async function uploadJobImages(files: File[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("images", file);
  }
  const { data } = await fetchApi<{ urls: string[] }>(apiPaths.jobs.images, {
    method: "POST",
    auth: true,
    body: form,
  });
  return data.urls ?? [];
}

export async function createJob(payload: CreateJobPayload) {
  const { data } = await fetchApi<{ message?: string; job: CreatedJob }>(apiPaths.jobs.create, {
    method: "POST",
    auth: true,
    body: payload,
  });
  return data;
}

export type UpdateJobPayload = Partial<CreateJobPayload> & {
  status?: "closed";
};

export async function updateMyJob(jobId: string, payload: UpdateJobPayload) {
  const { data } = await fetchApi<{ message?: string; job: CreatedJob }>(apiPaths.jobs.update(jobId), {
    method: "PATCH",
    auth: true,
    body: payload,
  });
  return data;
}

export async function closeMyJob(jobId: string) {
  return updateMyJob(jobId, { status: "closed" });
}

export async function deleteMyJob(jobId: string) {
  const { data } = await fetchApi<{ message?: string }>(apiPaths.jobs.delete(jobId), {
    method: "DELETE",
    auth: true,
  });
  return data;
}
