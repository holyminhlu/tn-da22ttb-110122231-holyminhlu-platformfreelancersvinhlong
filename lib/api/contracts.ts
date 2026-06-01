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
  service_id?: string | null;
  workflow_stage?: string | null;
  escrow_status?: string | null;
  proposal_text?: string | null;
  proposal_submitted_at?: string | null;
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

export type ContractMilestone = {
  id: string;
  title: string;
  amount: string | number;
  sort_order: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowContract = ContractRow & {
  workflow_stage: string;
  escrow_status: string;
  package_snapshot: unknown;
  client_brief: string | null;
  proposal_text: string | null;
  proposal_budget: string | number | null;
  proposal_submitted_at: string | null;
  demo_url: string | null;
  revisions_limit: number;
  revisions_used: number;
  funded_at: string | null;
  released_at: string | null;
  accepted_at: string | null;
  job_title: string | null;
  service_title: string | null;
  client_name: string | null;
  freelancer_name: string | null;
  freelancer_email: string | null;
};

export type ContractWorkflowResponse = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  review: { id: string; rating: number; comment: string | null; created_at: string } | null;
  role: "client" | "freelancer";
  stages: string[];
};

export type ServiceOrderListItem = {
  id: string;
  job_id: string | null;
  service_id: string | null;
  agreed_price: string | number | null;
  status: string;
  workflow_stage: string;
  escrow_status: string;
  package_snapshot: unknown;
  client_brief: string | null;
  proposal_text: string | null;
  proposal_submitted_at: string | null;
  progress_note: string | null;
  demo_url: string | null;
  delivered_at: string | null;
  funded_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
  service_title: string | null;
  job_title: string | null;
  counterparty_name: string | null;
  viewer_role: string;
};

export async function listServiceOrders() {
  const { data } = await fetchApi<{ orders: ServiceOrderListItem[]; role: string }>(
    apiPaths.contracts.serviceOrders,
    { auth: true },
  );
  return data;
}

export async function createServiceQuote(body: {
  serviceId: string;
  packageId: string;
  clientBrief: string;
  milestones?: { title: string; amount: number; sort_order?: number }[];
}) {
  const { data } = await fetchApi<{ contractId: string; jobId: string; message: string }>(
    apiPaths.contracts.fromServiceQuote,
    { method: "POST", body: JSON.stringify(body), auth: true },
  );
  return data;
}

export async function getContractWorkflow(contractId: string) {
  const { data } = await fetchApi<ContractWorkflowResponse>(
    apiPaths.contracts.workflow(contractId),
    { auth: true },
  );
  return data;
}

export async function patchContractWorkflow(
  contractId: string,
  body: Record<string, unknown> & { action: string },
) {
  const { data } = await fetchApi<{ message: string }>(
    apiPaths.contracts.workflow(contractId),
    { method: "PATCH", body: JSON.stringify(body), auth: true },
  );
  return data;
}

export async function reviewContract(
  contractId: string,
  body: { rating: number; comment?: string },
) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.contracts.review(contractId), {
    method: "POST",
    body: JSON.stringify(body),
    auth: true,
  });
  return data;
}
