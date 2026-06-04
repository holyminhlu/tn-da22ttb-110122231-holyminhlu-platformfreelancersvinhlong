import type { JobsListItem } from "@/components/jobs/jobs-filter";
import {
  contractStatusLabel,
  isWorkspaceArchived,
} from "@/components/jobs/jobs-filter";
import { workflowStageLabel } from "@/lib/orders/serviceOrderDisplay";

export type JobContractFilter = "all" | "active" | "completed" | "archived";

export function isJobOnlyContract(item: JobsListItem): boolean {
  return item.serviceId == null || item.serviceId === "";
}

export function isActiveJobContract(item: JobsListItem): boolean {
  const cs = String(item.contractStatus || "").toLowerCase();
  return cs === "active" || cs === "pending";
}

export function isCompletedJobContract(item: JobsListItem): boolean {
  return String(item.contractStatus || "").toLowerCase() === "completed";
}

export function jobContractStageLabel(item: JobsListItem): string {
  if (item.workflowStage) {
    return workflowStageLabel(item.workflowStage);
  }
  return contractStatusLabel(item.contractStatus);
}

export function jobContractStatusHint(item: JobsListItem): string {
  const stage = String(item.workflowStage || "").toLowerCase();
  if (stage === "execution") return "Đang thực hiện công việc theo hợp đồng";
  if (stage === "delivery") return "Chờ client nghiệm thu bàn giao";
  if (stage === "completion") return "Hoàn tất — có thể đã có đánh giá";
  if (isCompletedJobContract(item)) return "Hợp đồng đã hoàn thành";
  if (isWorkspaceArchived(item.contractStatus, item.jobStatus)) {
    return "Hợp đồng hoặc tin việc đã đóng / hủy";
  }
  if (isActiveJobContract(item)) return "Hợp đồng đang có hiệu lực";
  return contractStatusLabel(item.contractStatus);
}

export function filterJobContracts(
  items: JobsListItem[],
  filter: JobContractFilter,
  q: string,
): JobsListItem[] {
  const query = q.trim().toLowerCase();
  return items.filter((item) => {
    if (!isJobOnlyContract(item)) return false;
    if (filter === "active" && !isActiveJobContract(item)) return false;
    if (filter === "completed" && !isCompletedJobContract(item)) return false;
    if (
      filter === "archived" &&
      !isWorkspaceArchived(item.contractStatus, item.jobStatus)
    ) {
      return false;
    }
    if (!query) return true;
    const hay = [item.title, item.counterparty, item.jobId, item.progressNote]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
}

export function countJobContractsByFilter(
  items: JobsListItem[],
): Record<JobContractFilter, number> {
  const jobOnly = items.filter(isJobOnlyContract);
  return {
    all: jobOnly.length,
    active: jobOnly.filter(isActiveJobContract).length,
    completed: jobOnly.filter(isCompletedJobContract).length,
    archived: jobOnly.filter((i) =>
      isWorkspaceArchived(i.contractStatus, i.jobStatus),
    ).length,
  };
}

export function jobContractHref(
  item: JobsListItem,
  role: "client" | "freelancer" = "freelancer",
): string {
  if (item.id && item.id !== item.jobId) {
    return role === "client"
      ? `/hire/orders/${item.id}`
      : `/findwork/orders/${item.id}`;
  }
  return `/work/detail/${item.jobId}`;
}
