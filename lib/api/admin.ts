import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type AdminReviewStatus = "pending" | "approved" | "rejected";
export type AdminRoleFilter = "all" | "client" | "freelancer";

export type AdminApprovalListParams = {
  status?: AdminReviewStatus;
  role?: AdminRoleFilter;
  q?: string;
  readyOnly?: boolean;
  incompleteOnly?: boolean;
};

export type FreelancerApprovalItem = {
  userId: string;
  role: "client" | "freelancer" | string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  userStatus: string;
  submittedAt: string | null;
  adminReviewStatus: AdminReviewStatus | string;
  adminReviewedAt: string | null;
  adminReviewNote: string | null;
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  canApprove: boolean;
  blockers: string[];
  selfieUrl: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  addressProofUrl: string | null;
  cardLast4: string | null;
  cardVerifiedAt: string | null;
};

export async function listFreelancerApprovals(params: AdminApprovalListParams = {}) {
  const {
    status = "pending",
    role = "all",
    q = "",
    readyOnly = false,
    incompleteOnly = false,
  } = params;
  const search = new URLSearchParams();
  search.set("status", status);
  if (role !== "all") search.set("role", role);
  if (q.trim()) search.set("q", q.trim());
  if (readyOnly) search.set("readyOnly", "true");
  if (incompleteOnly) search.set("incompleteOnly", "true");

  const { data } = await fetchApi<{
    status: string;
    role: string;
    q: string;
    readyOnly: boolean;
    incompleteOnly: boolean;
    total: number;
    items: FreelancerApprovalItem[];
  }>(`${apiPaths.admin.freelancerApprovals}?${search.toString()}`, { auth: true });
  return data;
}

export async function approveFreelancerAccount(userId: string) {
  const { data } = await fetchApi<{ message: string; userId: string; status: string }>(
    apiPaths.admin.approveFreelancer(userId),
    { method: "POST", auth: true, body: {} },
  );
  return data;
}

export async function rejectFreelancerAccount(userId: string, note?: string) {
  const { data } = await fetchApi<{ message: string; userId: string; status: string }>(
    apiPaths.admin.rejectFreelancer(userId),
    { method: "POST", auth: true, body: { note } },
  );
  return data;
}

export type AdminDisputeStatusFilter = "open" | "resolved" | "all";
export type AdminDisputeStageFilter = "all" | "admin_review" | "awaiting_response" | "initiated";

export type AdminDisputeRow = {
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
  contract_status: string | null;
  job_title: string | null;
  service_title: string | null;
  client_id: string;
  freelancer_id: string;
  client_name: string | null;
  freelancer_name: string | null;
  message_count: number;
  evidence?: unknown;
};

export type AdminDisputeMessage = {
  id: string;
  author_id: string | null;
  author_role: string;
  body: string;
  attachments: string[] | unknown;
  created_at: string;
  author_name: string | null;
};

export type AdminDisputeDetailResponse = {
  dispute: AdminDisputeRow;
  messages: AdminDisputeMessage[];
  role: "admin";
};

export type AdminResolveDisputeAction = "full_refund" | "release" | "dismiss";

export async function listAdminDisputes(params?: {
  status?: AdminDisputeStatusFilter;
  stage?: AdminDisputeStageFilter;
  q?: string;
}) {
  const search = new URLSearchParams();
  search.set("status", params?.status ?? "open");
  search.set("stage", params?.stage ?? "all");
  if (params?.q?.trim()) search.set("q", params.q.trim());

  const { data } = await fetchApi<{
    total: number;
    disputes: AdminDisputeRow[];
  }>(`${apiPaths.admin.disputes}?${search.toString()}`, { auth: true });
  return data;
}

export async function getAdminDisputeDetail(disputeId: string) {
  const { data } = await fetchApi<AdminDisputeDetailResponse>(apiPaths.admin.dispute(disputeId), {
    auth: true,
  });
  return data;
}

export async function postAdminDisputeMessage(disputeId: string, body: string) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.admin.disputeMessages(disputeId), {
    method: "POST",
    auth: true,
    body: { body },
  });
  return data;
}

export async function resolveAdminDispute(
  disputeId: string,
  body: { resolution: AdminResolveDisputeAction; adminNote?: string },
) {
  const { data } = await fetchApi<{ message: string; resolution: string }>(
    apiPaths.admin.resolveDispute(disputeId),
    { method: "POST", auth: true, body },
  );
  return data;
}
