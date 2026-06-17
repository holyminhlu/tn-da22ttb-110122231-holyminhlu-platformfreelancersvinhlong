import type { FreelancerTransaction } from "@/lib/api/payments";
import { workflowStageLabel } from "@/lib/orders/serviceOrderDisplay";

export type FreelancerTxFilter = "all" | "income" | "withdraw" | "other";

export function filterFreelancerTransactions(
  rows: FreelancerTransaction[],
  filter: FreelancerTxFilter,
  q: string,
  jobId: string,
  clientId: string,
  month: string,
): FreelancerTransaction[] {
  const query = q.trim().toLowerCase();
  return rows.filter((t) => {
    const cat = String(t.category).toLowerCase();
    if (filter === "income" && !(t.amount > 0 || cat === "escrow_release" || cat === "milestone")) {
      return false;
    }
    if (filter === "withdraw" && cat !== "withdraw" && t.amount >= 0) return false;
    if (filter === "other" && (cat === "escrow_release" || cat === "milestone" || cat === "withdraw")) {
      return false;
    }
    if (jobId && t.jobId !== jobId) return false;
    if (clientId && t.clientId !== clientId) return false;
    if (month) {
      const d = new Date(t.occurredAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== month) return false;
    }
    if (!query) return true;
    const hay = [t.projectTitle, t.clientName, t.reference, t.withdrawalFailureReason]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
}

export function pendingStageLabel(stage: string | null): string {
  if (!stage) return "Đang ký quỹ";
  return workflowStageLabel(stage);
}

export function contractDetailHref(contractId: string): string {
  return `/findwork/orders/${contractId}`;
}
