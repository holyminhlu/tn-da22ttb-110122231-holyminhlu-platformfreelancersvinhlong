"use client";

import Link from "next/link";
import { FaStar } from "react-icons/fa";
import type { JobQuoteRow, PatchJobQuoteAction } from "@/lib/api/jobQuotes";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatDate } from "@/lib/format";
import {
  formatQuoteAmount,
  quoteClientActions,
  quoteRatingPercent,
  quoteStatusBadgeClass,
  quoteStatusLabel,
} from "@/lib/hire/quoteDisplay";
import { CLIENT_VERIFY_PAGE } from "@/lib/hire/clientVerification";
import AiQuoteSuggestButton from "./AiQuoteSuggestButton";

type HireQuoteGridCardProps = {
  quote: JobQuoteRow;
  showJobTitle?: boolean;
  busy?: boolean;
  onAction?: (quoteId: string, action: PatchJobQuoteAction) => void;
  onChat?: (quote: JobQuoteRow) => void;
  onAiCompare?: (quote: JobQuoteRow) => void;
  canAiCompare?: boolean;
  aiCompareBusy?: boolean;
  clientIdentityVerified?: boolean;
  clientIdentityLoading?: boolean;
};

export default function HireQuoteGridCard({
  quote,
  showJobTitle = false,
  busy = false,
  onAction,
  onChat,
  onAiCompare,
  canAiCompare = false,
  aiCompareBusy = false,
  clientIdentityVerified = true,
  clientIdentityLoading = false,
}: HireQuoteGridCardProps) {
  const needsVerify = !clientIdentityLoading && !clientIdentityVerified;
  const avatarSrc = resolveAvatarSrc(quote.freelancer_avatar_url);
  const name = quote.freelancer_name?.trim() || "Freelancer";
  const title = quote.freelancer_title?.trim() || "Freelancer";
  const message = quote.message?.trim() || "";
  const ratingPct = quoteRatingPercent(quote);
  const href = `/hire/quotes/${quote.id}`;
  const { canDecline } = quoteClientActions(quote.status);

  return (
    <article className={`hire-quote-product-card hire-quote-product-card--${quote.status}`}>
      <div className="hire-quote-product-card__media">
        <span className={`hire-favorites__badge ${quoteStatusBadgeClass(quote.status)}`}>
          {quoteStatusLabel(quote.status)}
        </span>

        {onAiCompare ? (
          <div className="hire-quote-product-card__ai-wrap">
            <AiQuoteSuggestButton
              onClick={() => onAiCompare(quote)}
              disabled={!canAiCompare}
              loading={aiCompareBusy}
              title={
                canAiCompare
                  ? "Gợi ý AI so sánh với các báo giá khác"
                  : "Cần ít nhất 2 báo giá để so sánh"
              }
            />
          </div>
        ) : null}

        <FreelancerAvatarFrame
          completedJobs={quote.completed_jobs}
          size={56}
          src={avatarSrc}
          alt={name}
          fallback={getUserInitials(name)}
          imgClassName="hire-favorites__avatar-img"
          className="hire-quote-product-card__avatar-wrap"
        />
      </div>

      <div className="hire-quote-product-card__body">
        {showJobTitle && quote.job_title ? (
          <p className="hire-quote-product-card__job" title={quote.job_title}>
            {quote.job_title}
          </p>
        ) : null}

        <h3 className="hire-quote-product-card__name">
          <Link href={href} title={name}>
            {name}
          </Link>
        </h3>

        <p className="hire-quote-product-card__title" title={title}>
          {title}
        </p>

        {message ? (
          <p className="hire-quote-product-card__message" title={message}>
            {message}
          </p>
        ) : null}

        <p className="hire-quote-product-card__meta-time">Gửi lúc {formatDate(quote.created_at)}</p>

        <p className="hire-quote-product-card__price">
          {formatQuoteAmount(quote)}
          <span className="hire-quote-product-card__price-type">
            {" · "}
            {quote.pricing_type === "hourly" ? "Theo giờ" : "Trọn gói"}
          </span>
        </p>

        {ratingPct > 0 ? (
          <p className="hire-quote-product-card__rating">
            <FaStar className="hire-favorites__meta-icon hire-favorites__meta-icon--star" aria-hidden />
            {ratingPct}%
          </p>
        ) : null}

        <div className="hire-quote-product-card__actions">
          <Link href={href} className="hire-quote-product-card__action">
            Xem chi tiết
          </Link>

          {canDecline ? (
            <button
              type="button"
              className="hire-quote-product-card__action hire-quote-product-card__action--decline"
              disabled={busy}
              onClick={() => onAction?.(quote.id, "decline")}
            >
              Từ chối
            </button>
          ) : (
            <span className="hire-quote-product-card__action hire-quote-product-card__action--placeholder" aria-hidden>
              —
            </span>
          )}
        </div>

        {needsVerify ? (
          <Link href={CLIENT_VERIFY_PAGE} className="hire-quote-product-card__chat-link">
            Xác minh để nhắn tin
          </Link>
        ) : onChat ? (
          <button
            type="button"
            className="hire-quote-product-card__chat-link"
            onClick={() => onChat(quote)}
          >
            Nhắn tin freelancer
          </button>
        ) : null}
      </div>
    </article>
  );
}
