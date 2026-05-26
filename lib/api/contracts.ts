import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type ContractRow = {
  id: string;
  job_id: string | null;
  service_id: string | null;
  agreed_price: string | number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  progress_note: string | null;
  delivered_at: string | null;
  job_title: string | null;
  job_status: string | null;
  counterparty_name: string | null;
};

export async function listMyContracts() {
  const { data } = await fetchApi<{ contracts: ContractRow[] }>(apiPaths.contracts.list, {
    auth: true,
  });
  return data;
}

export type MyWorkFreelancerAssignment = {
  contract_id: string;
  contract_status: string;
  agreed_price: string | number | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_created_at: string;
  progress_note: string | null;
  delivered_at: string | null;
  job_id: string;
  title: string;
  description: string | null;
  budget: string | number | null;
  job_status: string;
  job_created_at: string;
  job_images: unknown;
  job_due_at: string | null;
  review_id: string | null;
  review_rating: number | null;
  review_comment: string | null;
  review_created_at: string | null;
  client_name: string | null;
  client_email: string | null;
};

export type MyWorkClientJob = {
  job_id: string;
  title: string;
  description: string | null;
  budget: string | number | null;
  job_status: string;
  job_created_at: string;
  job_updated_at: string;
  job_images: unknown;
  job_due_at: string | null;
  contract_id: string | null;
  contract_status: string | null;
  agreed_price: string | number | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_created_at: string | null;
  progress_note: string | null;
  delivered_at: string | null;
  freelancer_id: string | null;
  freelancer_name: string | null;
  freelancer_email: string | null;
  review_id: string | null;
  review_rating: number | null;
  review_comment: string | null;
  review_created_at: string | null;
};

export type MyWorkResponse =
  | { role: "freelancer"; assignments: MyWorkFreelancerAssignment[] }
  | { role: "client"; jobs: MyWorkClientJob[] };

export async function getMyWork() {
  const { data } = await fetchApi<MyWorkResponse>(apiPaths.contracts.myWork, { auth: true });
  return data;
}
