"use client";



import Image from "next/image";

import Link from "next/link";

import { FaCommentDots, FaStar, FaTimes } from "react-icons/fa";

import type { JobQuoteRow, PatchJobQuoteAction } from "@/lib/api/jobQuotes";

import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";

import { formatDate } from "@/lib/format";

import {

  formatQuoteAmount,

  quoteRatingPercent,

  quoteStatusBadgeClass,

  quoteStatusLabel,

} from "@/lib/hire/quoteDisplay";



type HireQuoteGridCardProps = {

  quote: JobQuoteRow;

  showJobTitle?: boolean;

  busy?: boolean;

  onAction?: (quoteId: string, action: PatchJobQuoteAction) => void;

};



export default function HireQuoteGridCard({

  quote,

  showJobTitle = false,

  busy = false,

  onAction,

}: HireQuoteGridCardProps) {

  const avatarSrc = resolveAvatarSrc(quote.freelancer_avatar_url);

  const name = quote.freelancer_name?.trim() || "Freelancer";

  const title = quote.freelancer_title?.trim() || "Freelancer";

  const message = quote.message?.trim() || "";

  const ratingPct = quoteRatingPercent(quote);

  const href = `/hire/quotes/${quote.id}`;

  const profileHref = `/hire/search/${quote.freelancer_id}`;

  const status = String(quote.status).toLowerCase();

  const canOffer = ["pending", "shortlisted", "interviewing"].includes(status);

  const canHire = status === "offered";

  const canDecline = ["pending", "shortlisted", "interviewing", "offered"].includes(status);

  const isPending = status === "pending";



  return (

    <article className={`hire-quote-product-card hire-quote-product-card--${quote.status}`}>

      <div className="hire-quote-product-card__media">

        <span className={`hire-favorites__badge ${quoteStatusBadgeClass(quote.status)}`}>

          {quoteStatusLabel(quote.status)}

        </span>

        <div className="hire-quote-product-card__avatar-wrap" aria-hidden>

          {avatarSrc ? (

            <Image

              src={avatarSrc}

              alt=""

              width={56}

              height={56}

              className="hire-favorites__avatar-img"

              unoptimized

            />

          ) : (

            <span className="hire-favorites__avatar-fallback">{getUserInitials(name)}</span>

          )}

        </div>

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

        <p className="hire-quote-product-card__meta-time">

          Gửi lúc {formatDate(quote.created_at)}

        </p>

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

        <div className="hire-quote-product-card__quick" aria-label="Thao tác nhanh">

          <Link

            href={profileHref}

            className="hire-quote-product-card__icon-btn"

            title="Liên hệ freelancer"

            aria-label="Liên hệ freelancer"

          >

            <FaCommentDots aria-hidden />

          </Link>

          {isPending && onAction ? (

            <>

              <button

                type="button"

                className="hire-quote-product-card__icon-btn hire-quote-product-card__icon-btn--accept"

                disabled={busy}

                title="Gửi offer"

                aria-label="Gửi offer"

                onClick={() => onAction(quote.id, "offer")}

              >

                ✓

              </button>

              <button

                type="button"

                className="hire-quote-product-card__icon-btn hire-quote-product-card__icon-btn--decline"

                disabled={busy}

                title="Từ chối báo giá"

                aria-label="Từ chối báo giá"

                onClick={() => onAction(quote.id, "decline")}

              >

                <FaTimes aria-hidden />

              </button>

            </>

          ) : null}

        </div>

        <div className="hire-quote-product-card__actions">

          <Link href={href} className="hire-quote-product-card__action">

            Xem chi tiết

          </Link>

          {canOffer ? (

            <button

              type="button"

              className="hire-quote-product-card__action"

              disabled={busy}

              onClick={() => onAction?.(quote.id, "offer")}

            >

              {busy ? "Đang xử lý..." : "Gửi Offer"}

            </button>

          ) : null}

          {canDecline && !isPending ? (

            <button

              type="button"

              className="hire-quote-product-card__action"

              disabled={busy}

              onClick={() => onAction?.(quote.id, "decline")}

            >

              Từ chối

            </button>

          ) : null}

          {canHire ? (

            <button

              type="button"

              className="hire-quote-product-card__action hire-quote-product-card__action--primary"

              disabled={busy}

              onClick={() => onAction?.(quote.id, "accept")}

            >

              {busy ? "Đang xử lý..." : "Chốt tuyển"}

            </button>

          ) : null}

        </div>

      </div>

    </article>

  );

}


