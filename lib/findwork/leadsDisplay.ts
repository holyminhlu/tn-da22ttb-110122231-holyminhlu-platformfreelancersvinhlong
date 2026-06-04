import type { JobListing } from "@/lib/api/jobs";
import type { ServiceOrderListItem } from "@/lib/api/contracts";
import { quoteStatusLabel } from "@/lib/hire/quoteDisplay";

export type JobLeadKind = "new" | "pending" | "hot" | "other";

export type LeadFilter = "all" | "new" | "interested" | "service";

const HOT_STATUSES = new Set(["shortlisted", "interviewing", "offered"]);

export function jobLeadKind(job: JobListing): JobLeadKind {
  const status = String(job.my_quote_status || "").toLowerCase();
  if (HOT_STATUSES.has(status)) return "hot";
  if (status === "pending" || job.has_my_pending_quote) return "pending";
  if (String(job.status || "").toLowerCase() === "open" && !status) return "new";
  return "other";
}

export function jobLeadStatusLabel(job: JobListing): string {
  const kind = jobLeadKind(job);
  if (kind === "new") return "Việc mới";
  if (kind === "hot") return quoteStatusLabel(job.my_quote_status || "");
  if (kind === "pending") return "Đang chờ client";
  return "—";
}

export function isJobLeadVisible(job: JobListing): boolean {
  const kind = jobLeadKind(job);
  return kind === "new" || kind === "pending" || kind === "hot";
}

export function filterJobLeads(jobs: JobListing[], filter: LeadFilter, q: string): JobListing[] {
  const query = q.trim().toLowerCase();
  return jobs.filter((job) => {
    if (!isJobLeadVisible(job)) return false;
    const kind = jobLeadKind(job);
    if (filter === "new" && kind !== "new") return false;
    if (filter === "interested" && kind !== "hot" && kind !== "pending") return false;
    if (!query) return true;
    const hay = [
      job.title,
      job.client_name,
      job.category,
      job.location_label,
      job.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
}

export function countJobLeadsByFilter(jobs: JobListing[]): Record<LeadFilter, number> {
  const visible = jobs.filter(isJobLeadVisible);
  return {
    all: visible.length,
    new: visible.filter((j) => jobLeadKind(j) === "new").length,
    interested: visible.filter((j) => {
      const k = jobLeadKind(j);
      return k === "hot" || k === "pending";
    }).length,
    service: 0,
  };
}

export function isServiceLead(order: ServiceOrderListItem): boolean {
  return (
    order.workflow_stage === "selection" &&
    !order.proposal_text?.trim() &&
    String(order.status || "").toLowerCase() !== "cancelled"
  );
}

export function filterServiceLeads(
  orders: ServiceOrderListItem[],
  filter: LeadFilter,
  q: string,
): ServiceOrderListItem[] {
  if (filter !== "all" && filter !== "service") return [];
  const query = q.trim().toLowerCase();
  return orders.filter((order) => {
    if (!isServiceLead(order)) return false;
    if (!query) return true;
    const hay = [
      order.counterparty_name,
      order.service_title,
      order.job_title,
      order.client_brief,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
}

export function mergeLeadCounts(
  jobCounts: Record<LeadFilter, number>,
  serviceCount: number,
): Record<LeadFilter, number> {
  return {
    all: jobCounts.all + serviceCount,
    new: jobCounts.new,
    interested: jobCounts.interested,
    service: serviceCount,
  };
}
