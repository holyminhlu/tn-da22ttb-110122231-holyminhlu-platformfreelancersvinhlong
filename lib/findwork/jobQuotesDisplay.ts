import type { JobQuoteRow, JobQuoteStatus } from "@/lib/api/jobQuotes";
import { formatVnd } from "@/lib/format";
import { jobStatusLabel } from "@/lib/jobsDisplay";

export type FreelancerQuoteFilter = "all" | JobQuoteStatus | "active";

export type FreelancerQuoteSort = "newest" | "updated" | "price_desc" | "price_asc";

const ACTIVE_STATUSES = new Set<JobQuoteStatus>([
  "pending",
  "interviewing",
  "offered",
]);

const STATUS_PRIORITY: Record<string, number> = {
  offered: 0,
  interviewing: 1,
  pending: 2,
  accepted: 4,
  declined: 5,
  withdrawn: 6,
};

export function isActiveFreelancerQuote(quote: JobQuoteRow): boolean {
  return ACTIVE_STATUSES.has(String(quote.status).toLowerCase() as JobQuoteStatus);
}

export function freelancerQuoteStatusHint(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "pending") return "Đang chờ client xem xét";
  if (s === "shortlisted") return "Đang chờ client xem xét";
  if (s === "interviewing") return "Client muốn trao đổi thêm";
  if (s === "offered") return "Client đã gửi offer — chờ client chốt tuyển";
  if (s === "accepted") return "Bạn đã được tuyển cho việc này";
  if (s === "declined") return "Client đã từ chối báo giá";
  if (s === "withdrawn") return "Bạn đã rút báo giá";
  return status;
}

export function canWithdrawFreelancerQuote(quote: JobQuoteRow): boolean {
  return ["pending", "interviewing", "offered"].includes(
    String(quote.status).toLowerCase(),
  );
}

export function formatFreelancerQuoteAmount(quote: JobQuoteRow): string {
  if (quote.amount != null) {
    const amount = formatVnd(quote.amount);
    return quote.pricing_type === "hourly" ? `${amount}/giờ` : amount;
  }
  if (quote.job_budget != null) return formatVnd(quote.job_budget);
  return "Thỏa thuận";
}

export function filterFreelancerQuotes(
  quotes: JobQuoteRow[],
  filter: FreelancerQuoteFilter,
  q: string,
): JobQuoteRow[] {
  const query = q.trim().toLowerCase();
  return quotes.filter((quote) => {
    const status = String(quote.status).toLowerCase();
    if (filter === "active" && !ACTIVE_STATUSES.has(status as JobQuoteStatus)) return false;
    if (filter === "pending" && status !== "pending" && status !== "shortlisted") return false;
    if (filter !== "all" && filter !== "active" && filter !== "pending" && status !== filter) {
      return false;
    }
    if (!query) return true;
    const hay = [
      quote.job_title,
      quote.client_name,
      quote.message,
      quote.client_location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
}

export function sortFreelancerQuotes(
  quotes: JobQuoteRow[],
  sort: FreelancerQuoteSort,
): JobQuoteRow[] {
  const list = [...quotes];
  if (sort === "price_desc") {
    return list.sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0));
  }
  if (sort === "price_asc") {
    return list.sort((a, b) => {
      const pa = a.amount != null ? Number(a.amount) : Number.POSITIVE_INFINITY;
      const pb = b.amount != null ? Number(b.amount) : Number.POSITIVE_INFINITY;
      return pa - pb;
    });
  }
  if (sort === "updated") {
    return list.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }
  return list.sort((a, b) => {
    const pa = STATUS_PRIORITY[String(a.status).toLowerCase()] ?? 99;
    const pb = STATUS_PRIORITY[String(b.status).toLowerCase()] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function countFreelancerQuotesByFilter(
  quotes: JobQuoteRow[],
): Record<FreelancerQuoteFilter, number> {
  return {
    all: quotes.length,
    active: quotes.filter(isActiveFreelancerQuote).length,
    pending: quotes.filter((q) => {
      const s = String(q.status).toLowerCase();
      return s === "pending" || s === "shortlisted";
    }).length,
    shortlisted: 0,
    interviewing: quotes.filter((q) => String(q.status).toLowerCase() === "interviewing").length,
    offered: quotes.filter((q) => String(q.status).toLowerCase() === "offered").length,
    accepted: quotes.filter((q) => String(q.status).toLowerCase() === "accepted").length,
    declined: quotes.filter((q) => String(q.status).toLowerCase() === "declined").length,
    withdrawn: quotes.filter((q) => String(q.status).toLowerCase() === "withdrawn").length,
  };
}

export function jobStatusForQuote(quote: JobQuoteRow): string {
  return jobStatusLabel(quote.job_status || "");
}
