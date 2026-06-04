import type { JobQuoteRow } from "@/lib/api/jobQuotes";
import { formatVnd } from "@/lib/format";

export function quoteStatusLabel(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "pending") return "Đang chờ";
  if (s === "shortlisted") return "Shortlist";
  if (s === "interviewing") return "Phỏng vấn";
  if (s === "offered") return "Đã gửi offer";
  if (s === "accepted") return "Đã tuyển";
  if (s === "declined") return "Đã từ chối";
  if (s === "withdrawn") return "Đã rút";
  return status;
}

export type QuoteSort = "newest" | "price_asc" | "rating_desc";

export function sortJobQuotes(quotes: JobQuoteRow[], sort: QuoteSort): JobQuoteRow[] {
  const list = [...quotes];
  if (sort === "price_asc") {
    return list.sort((a, b) => {
      const pa = a.amount != null ? Number(a.amount) : Number.POSITIVE_INFINITY;
      const pb = b.amount != null ? Number(b.amount) : Number.POSITIVE_INFINITY;
      return pa - pb;
    });
  }
  if (sort === "rating_desc") {
    return list.sort((a, b) => quoteRatingPercent(b) - quoteRatingPercent(a));
  }
  return list.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
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
  const amount = quote.amount != null ? formatVnd(quote.amount) : "Thỏa thuận";
  if (quote.pricing_type === "hourly") return `${amount}/giờ`;
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
