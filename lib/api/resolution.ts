import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type RefundRequestRow = {
  id: string;
  contract_id: string;
  reason: string;
  reason_code: string | null;
  detail: string | null;
  refund_method: string | null;
  status: string;
  respond_by_at: string;
  freelancer_response: string | null;
  created_at: string;
  resolved_at: string | null;
  requested_by: string;
  agreed_price: string | number | null;
  escrow_status: string | null;
  workflow_stage: string | null;
  job_id: string | null;
  service_id: string | null;
  job_title: string | null;
  service_title: string | null;
  viewer_role: string;
  counterparty_name: string | null;
  legitimacy?: string | null;
  split_type?: string | null;
  penalty_percent?: number | string | null;
  work_done_percent?: number | string | null;
  client_refund_amount?: number | string | null;
  freelancer_amount?: number | string | null;
  platform_fee_amount?: number | string | null;
  workflow_stage_at_request?: string | null;
  had_progress_at_request?: boolean | null;
};

export type DisputeListRow = {
  id: string;
  contract_id: string;
  reason: string;
  issue_category: string | null;
  desired_resolution: string | null;
  desired_resolution_note: string | null;
  dispute_stage: string | null;
  respond_by_at: string | null;
  status: string;
  resolution: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  opened_by: string;
  agreed_price: string | number | null;
  workflow_stage: string | null;
  escrow_status: string | null;
  job_title: string | null;
  service_title: string | null;
  viewer_role: string;
  counterparty_name: string | null;
  message_count: number;
};

export type DisputeMessage = {
  id: string;
  author_id: string | null;
  author_role: string;
  body: string;
  attachments: string[] | unknown;
  created_at: string;
  author_name: string | null;
};

export type DisputeDetailResponse = {
  dispute: DisputeListRow & {
    client_id: string;
    freelancer_id: string;
    client_name: string | null;
    freelancer_name: string | null;
    evidence: unknown;
  };
  messages: DisputeMessage[];
  role: "client" | "freelancer";
};

export async function listRefundRequests() {
  const { data } = await fetchApi<{ requests: RefundRequestRow[] }>(
    apiPaths.contracts.refundRequests,
    { auth: true },
  );
  return data.requests ?? [];
}

export async function listDisputes() {
  const { data } = await fetchApi<{ disputes: DisputeListRow[] }>(apiPaths.contracts.disputes, {
    auth: true,
  });
  return data.disputes ?? [];
}

export async function getDisputeDetail(disputeId: string) {
  const { data } = await fetchApi<DisputeDetailResponse>(apiPaths.contracts.dispute(disputeId), {
    auth: true,
  });
  return data;
}

export async function postDisputeMessage(disputeId: string, body: string, attachments?: string[]) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.contracts.disputeMessages(disputeId), {
    method: "POST",
    auth: true,
    body: { body, attachments },
  });
  return data;
}

export async function uploadDisputeEvidence(files: File[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  const { data } = await fetchApi<{ urls: string[] }>(apiPaths.contracts.disputeEvidence, {
    method: "POST",
    auth: true,
    body: form,
  });
  return data.urls ?? [];
}

export type RefundRequestPayload = {
  reasonCode: string;
  detail?: string;
  refundMethod?: "wallet" | "card";
};

export type OpenDisputePayload = {
  issueCategory: string;
  desiredResolution: string;
  resolutionNote?: string;
  detail: string;
  evidenceUrls: string[];
};
