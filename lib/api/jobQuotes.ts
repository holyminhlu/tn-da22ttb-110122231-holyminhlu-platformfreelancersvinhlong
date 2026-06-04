import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type JobQuoteStatus =
  | "pending"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "accepted"
  | "declined"
  | "withdrawn";
export type JobQuotePricingType = "fixed" | "hourly";

export type JobQuoteRow = {
  id: string;
  job_id: string;
  job_title: string | null;
  freelancer_id: string;
  amount: string | number | null;
  currency: string;
  pricing_type: JobQuotePricingType;
  message: string | null;
  status: JobQuoteStatus;
  created_at: string;
  updated_at: string;
  freelancer_name: string | null;
  freelancer_email: string | null;
  freelancer_avatar_url: string | null;
  freelancer_title: string | null;
  freelancer_bio: string | null;
  freelancer_location: string | null;
  rating_avg: number | null;
  total_reviews: number;
  completed_jobs: number;
  job_success_score: number | null;
  client_name?: string | null;
  client_avatar_url?: string | null;
  client_location?: string | null;
  job_status?: string | null;
  job_budget?: number | null;
};

export type ListJobQuotesParams = {
  jobId?: string;
  status?: JobQuoteStatus;
  q?: string;
  includeWithdrawn?: boolean;
};

export async function listMyJobQuotes(params?: ListJobQuotesParams) {
  const search = new URLSearchParams();
  if (params?.jobId) search.set("job_id", params.jobId);
  if (params?.status) search.set("status", params.status);
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.includeWithdrawn) search.set("include_withdrawn", "1");
  const qs = search.toString();
  const path = qs ? `${apiPaths.jobs.quotes}?${qs}` : apiPaths.jobs.quotes;
  const { data } = await fetchApi<{ quotes: JobQuoteRow[]; role?: string }>(path, { auth: true });
  return data.quotes ?? [];
}

export async function getMyJobQuote(quoteId: string) {
  const quotes = await listMyJobQuotes();
  return quotes.find((row) => row.id === quoteId) ?? null;
}

export type PatchJobQuoteAction = "shortlist" | "interview" | "offer" | "accept" | "decline";
export type PatchFreelancerJobQuoteAction = "withdraw";

export async function patchJobQuote(quoteId: string, action: PatchJobQuoteAction) {
  const { data } = await fetchApi<{ message: string; contract?: { id: string } }>(
    apiPaths.jobs.quote(quoteId),
    { method: "PATCH", auth: true, body: { action } },
  );
  return data;
}

export async function withdrawJobQuote(quoteId: string) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.jobs.quote(quoteId), {
    method: "PATCH",
    auth: true,
    body: { action: "withdraw" },
  });
  return data;
}
