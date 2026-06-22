import type { JobQuoteRow } from "@/lib/api/jobQuotes";
import { formatVndUi, tUi } from "@/lib/i18n/runtime";

export function quoteStatusLabel(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "pending") return tUi("hirePage.quoteStatusPending");
  if (s === "shortlisted") return tUi("hirePage.quoteStatusPending");
  if (s === "interviewing") return tUi("hirePage.quoteStatusInterviewing");
  if (s === "offered") return tUi("hirePage.quoteStatusOffered");
  if (s === "accepted") return tUi("hirePage.quoteStatusAccepted");
  if (s === "declined") return tUi("hirePage.quoteStatusDeclined");
  if (s === "withdrawn") return tUi("hirePage.quoteStatusWithdrawn");
  return status;
}

const CLIENT_STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  shortlisted: 1,
  interviewing: 2,
  offered: 3,
  accepted: 4,
  declined: 5,
  withdrawn: 6,
};

function clientQuoteStatusPriority(status: string): number {
  return CLIENT_STATUS_PRIORITY[String(status).toLowerCase()] ?? 99;
}

function isTerminalClientQuote(status: string): boolean {
  const s = String(status).toLowerCase();
  return s === "declined" || s === "withdrawn";
}

export function quoteRecommendationScore(quote: JobQuoteRow): number {
  const rating = quote.rating_avg ?? 0;
  const reviews = Math.min(quote.total_reviews, 20) / 20;
  const completed = Math.min(quote.completed_jobs, 30) / 30;
  return rating * 0.7 + reviews * 2 + completed * 2;
}

function pinDeclinedLast(quotes: JobQuoteRow[]): JobQuoteRow[] {
  const active = quotes.filter((q) => !isTerminalClientQuote(q.status));
  const terminal = quotes.filter((q) => isTerminalClientQuote(q.status));
  return [...active, ...terminal];
}

export type QuoteSort = "priority" | "newest" | "price_asc" | "rating_desc";

export function sortJobQuotes(quotes: JobQuoteRow[], sort: QuoteSort): JobQuoteRow[] {
  const list = [...quotes];

  if (sort === "priority") {
    return list.sort((a, b) => {
      const pa = clientQuoteStatusPriority(a.status);
      const pb = clientQuoteStatusPriority(b.status);
      if (pa !== pb) return pa - pb;
      const scoreDiff = quoteRecommendationScore(b) - quoteRecommendationScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  let sorted: JobQuoteRow[];
  if (sort === "price_asc") {
    sorted = list.sort((a, b) => {
      const pa = a.amount != null ? Number(a.amount) : Number.POSITIVE_INFINITY;
      const pb = b.amount != null ? Number(b.amount) : Number.POSITIVE_INFINITY;
      return pa - pb;
    });
  } else if (sort === "rating_desc") {
    sorted = list.sort((a, b) => quoteRatingPercent(b) - quoteRatingPercent(a));
  } else {
    sorted = list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  return pinDeclinedLast(sorted);
}

export function quoteStatusBadgeClass(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "pending") return "hire-favorites__badge--quote-pending";
  if (s === "shortlisted" || s === "interviewing" || s === "offered") {
    return "hire-favorites__badge--quote-neutral";
  }
  if (s === "accepted") return "hire-favorites__badge--quote-accepted";
  if (s === "declined") return "hire-favorites__badge--quote-declined";
  return "hire-favorites__badge--quote-neutral";
}

export function formatQuoteAmount(quote: JobQuoteRow): string {
  const amount = quote.amount != null ? formatVndUi(quote.amount) : tUi("hirePage.negotiable");
  if (quote.pricing_type === "hourly") return `${amount}${tUi("hirePage.hourly")}`;
  return amount;
}

export function quoteRatingPercent(quote: JobQuoteRow): number {
  if (quote.job_success_score != null && quote.job_success_score > 0) {
    return Math.min(100, Math.round(quote.job_success_score));
  }
  if (quote.rating_avg != null && quote.rating_avg > 0) {
    return Math.min(100, Math.round((quote.rating_avg / 5) * 100));
  }
  return 0;
}

export type QuoteClientActions = {
  canDecline: boolean;
  canHire: boolean;
  isPending: boolean;
};

/** Quy tắc hiển thị nút khách hàng — khớp PATCH /api/jobs/me/quotes/:id */
export function quoteClientActions(status: string): QuoteClientActions {
  const s = String(status).toLowerCase();
  const actionable = ["pending", "shortlisted", "interviewing", "offered"].includes(s);
  return {
    canDecline: actionable,
    canHire: actionable,
    isPending: s === "pending" || s === "shortlisted",
  };
}
