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
  profileBio: string | null;
  profileDistrictCity: string | null;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
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
  accountType: string;
  useExistingAccountInfo: boolean;
  legalFirstName: string | null;
  legalLastName: string | null;
  addressSearch: string | null;
  addressStreet: string | null;
  addressCountry: string | null;
  addressState: string | null;
  addressCity: string | null;
  addressPostal: string | null;
  contactConfirmed: boolean;
  contactConfirmedAt: string | null;
  selfieUrl: string | null;
  idDocType: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  addressProofType: string | null;
  addressProofUrl: string | null;
  phoneSubmittedAt: string | null;
  photoSubmittedAt: string | null;
  idSubmittedAt: string | null;
  addressProofSubmittedAt: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiry: string | null;
  cardholderName: string | null;
  isBusinessCard: boolean;
  billingStreet: string | null;
  billingCountry: string | null;
  billingState: string | null;
  billingCity: string | null;
  billingPostal: string | null;
  billingPhone: string | null;
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

export async function getFreelancerApproval(userId: string) {
  const { data } = await fetchApi<{ item: FreelancerApprovalItem }>(
    apiPaths.admin.freelancerApproval(userId),
    { auth: true },
  );
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

export type AdminUserRoleFilter = "all" | "client" | "freelancer" | "admin";
export type AdminUserStatusFilter = "all" | "active" | "rejected" | "deactivated";

export type AdminUserItem = {
  userId: string;
  email: string;
  role: string;
  status: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  adminReviewStatus: string | null;
  submittedForReviewAt: string | null;
  bio?: string | null;
  districtCity?: string | null;
  adminReviewedAt?: string | null;
  adminReviewNote?: string | null;
};

export type AdminUserAccount = {
  email: string;
  hasPassword: boolean;
  role: string;
  status: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  recoveryEmail: string | null;
  recoveryPhone: string | null;
  loginAlertsEnabled: boolean;
  deactivatedAt: string | null;
  googleId: string | null;
  notificationPrefs: Record<string, unknown> | null;
  passwordUserSetAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AdminUserProfile = {
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bio: string | null;
  website: string | null;
  tagline: string | null;
  districtCity: string | null;
  city: string | null;
  stateProvince: string | null;
  country: string | null;
  coverUrl: string | null;
  clientSatisfactionScore: number | null;
  updatedAt: string | null;
};

export type AdminUserIdentity = {
  accountType: string;
  useExistingAccountInfo: boolean;
  legalFirstName: string | null;
  legalLastName: string | null;
  addressSearch: string | null;
  addressStreet: string | null;
  addressCountry: string | null;
  addressState: string | null;
  addressCity: string | null;
  addressPostal: string | null;
  contactConfirmed: boolean;
  contactConfirmedAt: string | null;
  selfieUrl: string | null;
  idDocType: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  addressProofType: string | null;
  addressProofUrl: string | null;
  phoneSubmittedAt: string | null;
  photoSubmittedAt: string | null;
  idSubmittedAt: string | null;
  addressProofSubmittedAt: string | null;
  submittedForReviewAt: string | null;
  adminReviewStatus: string | null;
  adminReviewedAt: string | null;
  adminReviewedBy: string | null;
  adminReviewNote: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiry: string | null;
  cardholderName: string | null;
  isBusinessCard: boolean;
  billingStreet: string | null;
  billingCountry: string | null;
  billingState: string | null;
  billingCity: string | null;
  billingPostal: string | null;
  billingPhone: string | null;
  cardVerifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminUserFreelancer = {
  title: string | null;
  hourlyRate: string | number | null;
  experienceYears: number | null;
  availabilityStatus: string | null;
  totalEarnings: string | number | null;
  ratingAvg: string | number | null;
  totalReviews: number | null;
  languages: unknown[];
  jobSuccessScore: number | null;
  avgResponseMinutes: number | null;
  profileBadges: unknown[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminUserFullItem = {
  userId: string;
  account: AdminUserAccount;
  profile: AdminUserProfile;
  identity: AdminUserIdentity | null;
  freelancer: AdminUserFreelancer | null;
};

export type AdminUserUpdatePayload = {
  email?: string;
  role?: "client" | "freelancer" | "admin";
  status?: "active" | "rejected";
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  recoveryEmail?: string | null;
  recoveryPhone?: string | null;
  loginAlertsEnabled?: boolean;
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  website?: string | null;
  tagline?: string | null;
  districtCity?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
};

export type AdminUserListParams = {
  role?: AdminUserRoleFilter;
  status?: AdminUserStatusFilter;
  q?: string;
  page?: number;
  limit?: number;
};

export async function listAdminUsers(params: AdminUserListParams = {}) {
  const { role = "all", status = "all", q = "", page = 1, limit = 25 } = params;
  const search = new URLSearchParams();
  if (role !== "all") search.set("role", role);
  if (status !== "all") search.set("status", status);
  if (q.trim()) search.set("q", q.trim());
  search.set("page", String(page));
  search.set("limit", String(limit));

  const { data } = await fetchApi<{
    role: string;
    status: string;
    q: string;
    page: number;
    limit: number;
    total: number;
    items: AdminUserItem[];
  }>(`${apiPaths.admin.users}?${search.toString()}`, { auth: true });
  return data;
}

export async function getAdminUser(userId: string) {
  const { data } = await fetchApi<{ item: AdminUserItem }>(apiPaths.admin.user(userId), {
    auth: true,
  });
  return data;
}

export async function getAdminUserFull(userId: string) {
  const { data } = await fetchApi<{ item: AdminUserFullItem }>(apiPaths.admin.userFull(userId), {
    auth: true,
  });
  return data;
}

export async function updateAdminUser(userId: string, payload: AdminUserUpdatePayload) {
  const { data } = await fetchApi<{ message: string; item: AdminUserFullItem }>(
    apiPaths.admin.updateUser(userId),
    { method: "PATCH", auth: true, body: payload },
  );
  return data;
}

export async function updateAdminUserStatus(userId: string, status: "active" | "rejected") {
  const { data } = await fetchApi<{ message: string; userId: string; status: string }>(
    apiPaths.admin.updateUserStatus(userId),
    { method: "PATCH", auth: true, body: { status } },
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

export type AdminResolveDisputeAction = "full_refund" | "release" | "dismiss" | "split";

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
  body: {
    resolution: AdminResolveDisputeAction;
    adminNote?: string;
    clientAmount?: number;
    freelancerAmount?: number;
  },
) {
  const { data } = await fetchApi<{ message: string; resolution: string }>(
    apiPaths.admin.resolveDispute(disputeId),
    { method: "POST", auth: true, body },
  );
  return data;
}

export type AdminRefundStatusFilter = "pending" | "resolved" | "all";

export type AdminRefundRow = {
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
  contract_status: string | null;
  job_title: string | null;
  service_title: string | null;
  client_id: string;
  freelancer_id: string;
  client_name: string | null;
  freelancer_name: string | null;
  client_email: string | null;
  freelancer_email: string | null;
  legitimacy?: string | null;
  split_type?: string | null;
  penalty_percent?: number | string | null;
  work_done_percent?: number | string | null;
  client_refund_amount?: number | string | null;
  freelancer_amount?: number | string | null;
  platform_fee_amount?: number | string | null;
  workflow_stage_at_request?: string | null;
  had_progress_at_request?: boolean | null;
  admin_note?: string | null;
};

export type AdminRefundWorkflowEvent = {
  event_type: string;
  payload: unknown;
  created_at: string;
};

export type AdminRefundDetailResponse = {
  request: AdminRefundRow;
  events: AdminRefundWorkflowEvent[];
  role: "admin";
};

export type AdminResolveRefundAction = "approve" | "reject";

export async function listAdminRefunds(params?: {
  status?: AdminRefundStatusFilter;
  q?: string;
}) {
  const search = new URLSearchParams();
  search.set("status", params?.status ?? "pending");
  if (params?.q?.trim()) search.set("q", params.q.trim());

  const { data } = await fetchApi<{
    total: number;
    requests: AdminRefundRow[];
  }>(`${apiPaths.admin.refunds}?${search.toString()}`, { auth: true });
  return data;
}

export async function getAdminRefundDetail(requestId: string) {
  const { data } = await fetchApi<AdminRefundDetailResponse>(apiPaths.admin.refund(requestId), {
    auth: true,
  });
  return data;
}

export async function resolveAdminRefund(
  requestId: string,
  body: {
    resolution: AdminResolveRefundAction;
    adminNote?: string;
    legitimacy?: "legitimate" | "unjustified";
    penaltyPercent?: number;
  },
) {
  const { data } = await fetchApi<{ message: string; resolution: string }>(
    apiPaths.admin.resolveRefund(requestId),
    { method: "POST", auth: true, body },
  );
  return data;
}

export type AdminWithdrawalStatusFilter = "pending" | "completed" | "failed" | "all";

export type AdminWithdrawalRow = {
  id: string;
  user_id: string;
  reference_id: string;
  amount: number;
  status: string;
  bank_name: string;
  account_holder_name: string;
  account_last4: string;
  to_bin: string | null;
  to_account_number: string;
  description: string | null;
  failure_reason: string | null;
  transaction_id: string | null;
  auth_verified_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  requester_name: string | null;
  requester_email: string | null;
  requester_role: string | null;
  freelancer_name: string | null;
  freelancer_email: string | null;
  qr_url: string | null;
};

export async function listAdminWithdrawals(params?: {
  status?: AdminWithdrawalStatusFilter;
  q?: string;
  audience?: "freelancer" | "client" | "all";
}) {
  const search = new URLSearchParams();
  search.set("status", params?.status ?? "pending");
  search.set("audience", params?.audience ?? "freelancer");
  if (params?.q?.trim()) search.set("q", params.q.trim());
  const { data } = await fetchApi<{
    total: number;
    requests: AdminWithdrawalRow[];
    audience: string;
  }>(`${apiPaths.admin.withdrawals}?${search.toString()}`, { auth: true });
  return data;
}

export async function getAdminWithdrawalDetail(withdrawalId: string) {
  const { data } = await fetchApi<{ request: AdminWithdrawalRow; role: "admin" }>(
    apiPaths.admin.withdrawal(withdrawalId),
    { auth: true },
  );
  return data;
}

export async function resolveAdminWithdrawal(
  withdrawalId: string,
  body: {
    resolution: "approve" | "reject";
    adminNote?: string;
    rejectReason?: string;
  },
) {
  const { data } = await fetchApi<{ message: string; resolution: string }>(
    apiPaths.admin.resolveWithdrawal(withdrawalId),
    { method: "POST", auth: true, body },
  );
  return data;
}
