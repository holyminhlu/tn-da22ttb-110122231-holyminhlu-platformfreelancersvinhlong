import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type AdminStatsTrendPoint = {
  date: string;
  count: number;
  amount?: number;
};

export type AdminStatsOverview = {
  totalUsers: number;
  totalClients: number;
  totalFreelancers: number;
  newUsers7d: number;
  newUsers30d: number;
  pendingApprovals: number;
  pendingRefunds: number;
  openDisputes: number;
  pendingWithdrawals: number;
  totalContracts: number;
  completedContracts: number;
  gmvReleased: number;
  satisfactionRate: number;
  totalEscrow: number;
};

export type AdminStatsPayload = {
  updatedAt: string;
  overview: AdminStatsOverview;
  usersByRole: { role: string; count: number }[];
  contractsByStage: { stage: string; label: string; count: number }[];
  queue: {
    refunds: { pending: number; resolved: number };
    disputes: { open: number; resolved: number };
    withdrawals: { pending: number; paid: number; failed: number };
  };
  trends: {
    users: AdminStatsTrendPoint[];
    contractsCreated: AdminStatsTrendPoint[];
    contractsReleased: AdminStatsTrendPoint[];
    withdrawals: AdminStatsTrendPoint[];
  };
  usage: {
    profileEvents30d: number;
    profileEventsByType: { type: string; label: string; count: number }[];
    chatMessages30d: number;
    chatConversations: number;
  };
};

export async function getAdminStatsOverview() {
  const { data } = await fetchApi<AdminStatsPayload>(apiPaths.admin.statsOverview, { auth: true });
  return data;
}
