import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type AdminReviewStatus = "pending" | "approved" | "rejected";

export type FreelancerApprovalItem = {
  userId: string;
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

export async function listFreelancerApprovals(status: AdminReviewStatus = "pending") {
  const { data } = await fetchApi<{ status: string; items: FreelancerApprovalItem[] }>(
    `${apiPaths.admin.freelancerApprovals}?status=${encodeURIComponent(status)}`,
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
