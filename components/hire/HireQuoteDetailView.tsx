"use client";

import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import Link from "next/link";
import { FreelancerChatInlineButton } from "@/components/chat/FreelancerChatWidget";
import {
  FaBriefcase,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaStar,
  FaThumbsUp,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import type { JobQuoteRow } from "@/lib/api/jobQuotes";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatDate } from "@/lib/format";
import {
  formatQuoteAmount,
  quoteClientActions,
  quoteRatingPercent,
  quoteStatusBadgeClass,
  quoteStatusLabel,
} from "@/lib/hire/quoteDisplay";

type HireQuoteDetailViewProps = {
  quote: JobQuoteRow;
  busy?: boolean;
  actionError?: string;
  onOffer?: (quoteId: string) => void;
  onAccept?: (quoteId: string) => void;
  onDecline?: (quoteId: string) => void;
  onChat?: () => void;
};

export default function HireQuoteDetailView({
  quote,
  busy,
  actionError,
  onOffer,
  onAccept,
  onDecline,
  onChat,
}: HireQuoteDetailViewProps) {
  const avatarSrc = resolveAvatarSrc(quote.freelancer_avatar_url);
  const name = quote.freelancer_name?.trim() || "Freelancer";
  const title = quote.freelancer_title?.trim() || "Thành viên VLC";
  const location = quote.freelancer_location?.trim() || "—";
  const ratingPct = quoteRatingPercent(quote);
  const message = quote.message?.trim() || "";
  const { canOffer, canDecline, canHire } = quoteClientActions(quote.status);
  const profileHref = `/hire/search/${quote.freelancer_id}`;

  return (
    <article className="hire-favorites__card hire-quote-detail">
      {actionError ? (
        <p className="hire-quotes__action-error hire-quote-detail__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="hire-favorites__card-main">
        <FreelancerAvatarFrame
          completedJobs={quote.completed_jobs}
          size={56}
          src={avatarSrc}
          alt={name}
          fallback={getUserInitials(name)}
          imgClassName="hire-favorites__avatar-img"
          className="hire-favorites__avatar"
        />

        <div className="hire-favorites__card-body">
          <div className="hire-favorites__card-head">
            <div className="hire-favorites__identity">
              <h1 className="hire-favorites__name">{name}</h1>
              {title ? <p className="hire-favorites__title">{title}</p> : null}
              <div className="hire-favorites__badges">
                <span className={`hire-favorites__badge ${quoteStatusBadgeClass(quote.status)}`}>
                  {quoteStatusLabel(quote.status)}
                </span>
                <span className="hire-favorites__badge hire-favorites__badge--quote-neutral">
                  {quote.pricing_type === "hourly" ? "Theo giờ" : "Trọn gói"}
                </span>
              </div>
            </div>
            <div className="hire-quote-detail__price-block">
              <p className="hire-quote-detail__price">{formatQuoteAmount(quote)}</p>
            </div>
          </div>

          <dl className="hire-favorites__meta">
            <div>
              <dt className="hire-favorites__sr-only">Vị trí</dt>
              <dd>
                <FaMapMarkerAlt className="hire-favorites__meta-icon" aria-hidden />
                {location}
              </dd>
            </div>
            {ratingPct > 0 ? (
              <div>
                <dt className="hire-favorites__sr-only">Hài lòng</dt>
                <dd>
                  <FaThumbsUp className="hire-favorites__meta-icon" aria-hidden />
                  {ratingPct}%
                </dd>
              </div>
            ) : null}
            {quote.rating_avg != null && quote.rating_avg > 0 ? (
              <div>
                <dt className="hire-favorites__sr-only">Đánh giá</dt>
                <dd>
                  <FaStar className="hire-favorites__meta-icon hire-favorites__meta-icon--star" aria-hidden />
                  {Number(quote.rating_avg).toFixed(1)}/5
                  {quote.total_reviews > 0 ? ` (${quote.total_reviews})` : ""}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="hire-favorites__sr-only">Việc hoàn thành</dt>
              <dd>
                <FaBriefcase className="hire-favorites__meta-icon" aria-hidden />
                {quote.completed_jobs} việc
              </dd>
            </div>
            <div>
              <dt className="hire-favorites__sr-only">Ngày gửi</dt>
              <dd>{formatDate(quote.created_at)}</dd>
            </div>
          </dl>

          {quote.job_title ? (
            <dl className="hire-favorites__meta">
              <div className="hire-favorites__meta-wide">
                <dt>Công việc</dt>
                <dd>{quote.job_title}</dd>
              </div>
            </dl>
          ) : null}

          {quote.freelancer_bio?.trim() ? (
            <dl className="hire-favorites__meta">
              <div className="hire-favorites__meta-wide">
                <dt>Giới thiệu</dt>
                <dd>{quote.freelancer_bio.trim()}</dd>
              </div>
            </dl>
          ) : null}

          <dl className="hire-favorites__meta">
            <div className="hire-favorites__meta-wide">
              <dt>Thư đề xuất</dt>
              <dd>{message || "Freelancer chưa gửi kèm thư đề xuất chi tiết."}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="hire-favorites__actions">
        <Link href={profileHref} className="hire-favorites__action">
          <FaUser aria-hidden />
          Xem hồ sơ
        </Link>
        {onChat ? <FreelancerChatInlineButton onClick={onChat} /> : null}
        {canOffer ? (
          <button
            type="button"
            className="hire-favorites__action"
            disabled={busy}
            onClick={() => onOffer?.(quote.id)}
          >
            Gửi đề xuất
          </button>
        ) : null}
        {canDecline ? (
          <button
            type="button"
            className="hire-favorites__action"
            disabled={busy}
            onClick={() => onDecline?.(quote.id)}
          >
            <FaTimes aria-hidden />
            Từ chối
          </button>
        ) : null}
        {canHire ? (
          <>
            <button
              type="button"
              className="hire-favorites__action hire-favorites__action--primary"
              disabled={busy}
              onClick={() => onAccept?.(quote.id)}
            >
              <FaCheckCircle aria-hidden />
              {busy ? "Đang xử lý…" : "Chốt tuyển"}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}
