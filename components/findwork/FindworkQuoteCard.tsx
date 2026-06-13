"use client";

import Image from "next/image";
import Link from "next/link";
import type { JobQuoteRow } from "@/lib/api/jobQuotes";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatDate } from "@/lib/format";
import { quoteStatusLabel } from "@/lib/hire/quoteDisplay";
import {
  canWithdrawFreelancerQuote,
  formatFreelancerQuoteAmount,
  freelancerQuoteStatusHint,
  jobStatusForQuote,
} from "@/lib/findwork/jobQuotesDisplay";

type FindworkQuoteCardProps = {
  quote: JobQuoteRow;
  busy?: boolean;
  onWithdraw?: (quoteId: string) => void;
};

function badgeToneClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending") return "fw-quotes__badge fw-quotes__badge--pending";
  if (s === "accepted") return "fw-quotes__badge fw-quotes__badge--accepted";
  if (s === "offered") return "fw-quotes__badge fw-quotes__badge--offered";
  if (s === "interviewing") return "fw-quotes__badge fw-quotes__badge--hot";
  if (s === "shortlisted") return "fw-quotes__badge fw-quotes__badge--pending";
  return "fw-quotes__badge fw-quotes__badge--muted";
}

export default function FindworkQuoteCard({ quote, busy = false, onWithdraw }: FindworkQuoteCardProps) {
  const status = String(quote.status).toLowerCase();
  const clientName = quote.client_name?.trim() || "Khách hàng";
  const avatarSrc = resolveAvatarSrc(quote.client_avatar_url);
  const jobHref = `/work/detail/${quote.job_id}`;
  const message = quote.message?.trim() || "";
  const canWithdraw = canWithdrawFreelancerQuote(quote);

  return (
    <li
      className={`fw-quotes__card fw-quotes__card--${status}`}
      role="listitem"
    >
      <div className="fw-quotes__card-head">
        <span className={badgeToneClass(status)}>{quoteStatusLabel(quote.status)}</span>
        <span className="fw-quotes__job-status">{jobStatusForQuote(quote)}</span>
      </div>

      <div className="fw-quotes__card-body">
        <div className="fw-quotes__client-row">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt=""
              width={36}
              height={36}
              className="fw-quotes__avatar"
              unoptimized
            />
          ) : (
            <span className="fw-quotes__avatar" aria-hidden>
              {getUserInitials(clientName)}
            </span>
          )}
          <p className="fw-quotes__client-name">{clientName}</p>
        </div>

        <h2 className="fw-quotes__job-title">
          <Link href={jobHref}>{quote.job_title?.trim() || "Công việc"}</Link>
        </h2>

        <p className="fw-quotes__hint">{freelancerQuoteStatusHint(quote.status)}</p>

        {message ? <p className="fw-quotes__message">{message}</p> : null}

        <p className="fw-quotes__price">
          {formatFreelancerQuoteAmount(quote)}
          <span className="fw-quotes__price-type">
            {" · "}
            {quote.pricing_type === "hourly" ? "Theo giờ" : "Trọn gói"}
          </span>
        </p>

        <p className="fw-quotes__time">
          Gửi {formatDate(quote.created_at)}
          {quote.updated_at !== quote.created_at
            ? ` · Cập nhật ${formatDate(quote.updated_at)}`
            : ""}
        </p>

        <div className="fw-quotes__actions">
          <Link href={jobHref} className="fw-quotes__action">
            Xem việc
          </Link>
          {canWithdraw && onWithdraw ? (
            <button
              type="button"
              className="fw-quotes__action fw-quotes__action--muted"
              disabled={busy}
              onClick={() => onWithdraw(quote.id)}
            >
              {busy ? "Đang xử lý..." : "Rút báo giá"}
            </button>
          ) : null}
          {status === "accepted" ? (
            <Link href="/jobs" className="fw-quotes__action">
              Hợp đồng việc →
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
