import type { MyWorkClientJob, MyWorkFreelancerAssignment } from "@/lib/api/contracts";
import type { JobsFilter, JobsSort } from "./constants";

export type JobsListItem = {
  id: string;
  jobId: string;
  title: string;
  counterparty: string | null;
  contractStatus: string;
  jobStatus: string;
  agreedPrice: string | number | null;
  budget: string | number | null;
  activityAt: string;
  hasSafepay: boolean;
  serviceId?: string | null;
  workflowStage?: string | null;
  escrowStatus?: string | null;
  proposalText?: string | null;
  progressNote?: string | null;
  jobDueAt?: string | null;
  deliveredAt?: string | null;
  reviewRating?: number | null;
};

function normalizeStatus(s: string) {
  return String(s || "").toLowerCase();
}

export function isWorkspaceArchived(contractStatus: string, jobStatus: string) {
  const cs = normalizeStatus(contractStatus);
  const js = normalizeStatus(jobStatus);
  return cs === "cancelled" || js === "closed";
}

function isArchived(contractStatus: string, jobStatus: string) {
  return isWorkspaceArchived(contractStatus, jobStatus);
}

function isCompleted(contractStatus: string) {
  return normalizeStatus(contractStatus) === "completed";
}

export function assignmentToListItem(row: MyWorkFreelancerAssignment): JobsListItem {
  const escrow = String(row.escrow_status || "").toLowerCase();
  return {
    id: row.contract_id,
    jobId: row.job_id,
    title: row.title,
    counterparty: row.client_name || row.client_email,
    contractStatus: row.contract_status,
    jobStatus: row.job_status,
    agreedPrice: row.agreed_price,
    budget: row.budget,
    activityAt: row.delivered_at || row.contract_created_at,
    hasSafepay: escrow === "funded" || escrow === "released",
    serviceId: row.service_id ?? null,
    workflowStage: row.workflow_stage ?? null,
    escrowStatus: row.escrow_status ?? null,
    proposalText: row.proposal_text ?? null,
    progressNote: row.progress_note ?? null,
    jobDueAt: row.job_due_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    reviewRating: row.review_rating ?? null,
  };
}

export function clientJobToListItem(row: MyWorkClientJob): JobsListItem {
  return {
    id: row.contract_id || row.job_id,
    jobId: row.job_id,
    title: row.title,
    counterparty: row.freelancer_name || row.freelancer_email,
    contractStatus: row.contract_status || row.job_status,
    jobStatus: row.job_status,
    agreedPrice: row.agreed_price,
    budget: row.budget,
    activityAt: row.delivered_at || row.contract_created_at || row.job_updated_at || row.job_created_at,
    hasSafepay: false,
    serviceId: row.service_id ?? null,
    workflowStage: row.workflow_stage ?? null,
    escrowStatus: row.escrow_status ?? null,
    proposalText: row.proposal_text ?? null,
  };
}

export function filterJobsItems(items: JobsListItem[], filter: JobsFilter): JobsListItem[] {
  switch (filter) {
    case "completed":
      return items.filter((i) => isCompleted(i.contractStatus));
    case "archived":
      return items.filter((i) => isArchived(i.contractStatus, i.jobStatus));
    case "safepay":
      return items.filter((i) => i.hasSafepay);
    case "archived_safepay":
      return items.filter((i) => i.hasSafepay && isArchived(i.contractStatus, i.jobStatus));
    default:
      return items;
  }
}

export function sortJobsItems(items: JobsListItem[], sort: JobsSort): JobsListItem[] {
  const copy = [...items];
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title, "vi"));
  }
  if (sort === "oldest") {
    return copy.sort(
      (a, b) => new Date(a.activityAt).getTime() - new Date(b.activityAt).getTime(),
    );
  }
  return copy.sort(
    (a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime(),
  );
}

export function searchJobsItems(items: JobsListItem[], q: string): JobsListItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (i) =>
      i.title.toLowerCase().includes(needle) ||
      i.jobId.toLowerCase().includes(needle) ||
      (i.counterparty?.toLowerCase().includes(needle) ?? false),
  );
}

export function contractStatusLabel(status: string): string {
  const s = normalizeStatus(status);
  if (s === "active") return "Đang thực hiện";
  if (s === "pending") return "Chờ xử lý";
  if (s === "completed") return "Hoàn thành";
  if (s === "cancelled") return "Đã hủy";
  if (s === "in_progress") return "Đang tiến hành";
  if (s === "open") return "Đang mở";
  if (s === "closed") return "Đã đóng";
  return status || "—";
}

export function contractStatusClass(status: string): string {
  const s = normalizeStatus(status);
  if (s === "active" || s === "in_progress") return "jobs-card__status jobs-card__status--active";
  if (s === "pending" || s === "open") return "jobs-card__status jobs-card__status--pending";
  if (s === "completed") return "jobs-card__status jobs-card__status--completed";
  return "jobs-card__status jobs-card__status--archived";
}
