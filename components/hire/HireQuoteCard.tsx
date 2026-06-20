"use client";

import { formatDateUi, formatVndUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useState } from "react";
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
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import type { JobQuoteRow } from "@/lib/api/jobQuotes";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
type HireQuoteCardProps = {
  quote: JobQuoteRow;
  busy?: boolean;
  onAccept?: (quoteId: string) => void;
  onDecline?: (quoteId: string) => void;
  onChat?: (quote: JobQuoteRow) => void;
};

function quoteStatusLabel(status: string): string {
  const s = String(status).toLowerCase();
  if (s === "pending") return "Chờ xử lý";
  if (s === "accepted") return "Đã chọn";
  if (s === "declined") return "Đã từ chối";
  if (s === "withdrawn") return "Đã rút";
  return status;
}

function formatQuoteAmount(quote: JobQuoteRow): string {
  const amount = quote.amount != null ? formatVndUi(quote.amount) : "Thỏa thuận";
  if (quote.pricing_type === "hourly") return `${amount}/giờ`;
  return amount;
}

export default function HireQuoteCard({
  quote, busy, onAccept, onDecline, onChat }: HireQuoteCardProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const avatarSrc = resolveAvatarSrc(quote.freelancer_avatar_url);
  const name = quote.freelancer_name?.trim() || "Freelancer";
  const title = quote.freelancer_title?.trim() || t("Thành viên VLC");
  const location = quote.freelancer_location?.trim() || "—";
  const ratingPct =
    quote.job_success_score != null && quote.job_success_score > 0
      ? Math.min(100, Math.round(quote.job_success_score))
      : quote.rating_avg != null && quote.rating_avg > 0
        ? Math.min(100, Math.round((quote.rating_avg / 5) * 100))
        : 0;
  const message = quote.message?.trim() || "";
  const isPending = String(quote.status).toLowerCase() === "pending";
  const profileHref = `/hire/search/${quote.freelancer_id}`;

  return (
    <article className={`hire-quote-card hire-quote-card--${quote.status}`}>
      <div className="hire-quote-card__head">
        <div className="hire-quote-card__freelancer">
          <Link href={profileHref} className="hire-quote-card__avatar-link">
            <FreelancerAvatarFrame
              completedJobs={quote.completed_jobs}
              size={52}
              src={avatarSrc}
              alt={name}
              fallback={getUserInitials(name)}
              imgClassName="hire-quote-card__avatar"
            />
          </Link>
          <div className="hire-quote-card__identity">
            <Link href={profileHref} className="hire-quote-card__name">
              {name}
            </Link>
            <p className="hire-quote-card__title">{title}</p>
            <p className="hire-quote-card__location">
              <FaMapMarkerAlt aria-hidden />
              {location}
            </p>
          </div>
        </div>

        <div className="hire-quote-card__price-block">
          <p className="hire-quote-card__price">{formatQuoteAmount(quote)}</p>
          <p className="hire-quote-card__price-type">
            {quote.pricing_type === "hourly" ? "Theo giờ" : "Trọn gói dự án"}
          </p>
          <span className={`hire-quote-card__status hire-quote-card__status--${quote.status}`}>
            {quoteStatusLabel(quote.status)}
          </span>
        </div>
      </div>

      <dl className="hire-quote-card__stats">
        <div>
          <dt>
            <FaThumbsUp aria-hidden /> Hài lòng
          </dt>
          <dd>{ratingPct > 0 ? `${ratingPct}%` : "—"}</dd>
        </div>
        <div>
          <dt>
            <FaStar aria-hidden /> Đánh giá
          </dt>
          <dd>
            {quote.rating_avg != null && quote.rating_avg > 0
              ? `${Number(quote.rating_avg).toFixed(1)}/5 (${quote.total_reviews})`
              : "Chưa có"}
          </dd>
        </div>
        <div>
          <dt>
            <FaBriefcase aria-hidden /> Việc hoàn thành
          </dt>
          <dd>{quote.completed_jobs}</dd>
        </div>
        <div>
          <dt>{t("Gửi ngày")}</dt>
          <dd>{formatDateUi(quote.created_at)}</dd>
        </div>
      </dl>

      {quote.freelancer_bio?.trim() ? (
        <p className="hire-quote-card__bio">{quote.freelancer_bio.trim()}</p>
      ) : null}

      <div className="hire-quote-card__proposal">
        <h3 className="hire-quote-card__proposal-title">{t("Thư đề xuất")}</h3>
        {message ? (
          <>
            <p className={`hire-quote-card__message${expanded ? "" : " hire-quote-card__message--clamp"}`}>
              {message}
            </p>
            {message.length > 220 ? (
              <button
                type="button"
                className="hire-quote-card__read-more"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Thu gọn" : "Xem thêm"}
              </button>
            ) : null}
          </>
        ) : (
          <p className="hire-quote-card__message hire-quote-card__message--empty">
            Freelancer chưa gửi kèm thư đề xuất chi tiết.
          </p>
        )}
      </div>

      <div className="hire-quote-card__actions">
        <Link href={profileHref} className="hire-quote-card__btn hire-quote-card__btn--ghost">
          <FaUser aria-hidden />
          Xem hồ sơ
        </Link>
        {onChat ? (
          <FreelancerChatInlineButton onClick={() => onChat(quote)} />
        ) : null}
        {isPending ? (
          <>
            <button
              type="button"
              className="hire-quote-card__btn hire-quote-card__btn--decline"
              disabled={busy}
              onClick={() => onDecline?.(quote.id)}
            >
              <FaTimes aria-hidden />
              Từ chối
            </button>
            <button
              type="button"
              className="hire-quote-card__btn hire-quote-card__btn--hire"
              disabled={busy}
              onClick={() => onAccept?.(quote.id)}
            >
              <FaCheckCircle aria-hidden />
              {busy ? "Đang xử lý…" : "Thuê"}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

export { quoteStatusLabel, formatQuoteAmount };
