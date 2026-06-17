import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type HomeStatsPayload = {
  totalClients: number;
  paidInvoices: number;
  paidToFreelancers: number;
  satisfactionRate: number;
};

export async function getPublicHomeStats() {
  const { data } = await fetchApi<{ stats: HomeStatsPayload; updatedAt: string }>(
    apiPaths.users.publicHomeStats,
  );
  return data;
}
