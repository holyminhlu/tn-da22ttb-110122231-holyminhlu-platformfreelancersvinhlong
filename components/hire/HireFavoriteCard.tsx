"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import {
  FaComment,
  FaEnvelope,
  FaHeart,
  FaMapMarkerAlt,
  FaStar,
  FaUserTie,
} from "react-icons/fa";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { CLIENT_VERIFY_PAGE } from "@/lib/hire/clientVerification";
import type { HireFavoriteEntry } from "./hireFavoritesTypes";

type HireFavoriteCardProps = {
  entry: HireFavoriteEntry;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onMessage: (entry: HireFavoriteEntry) => void;
  clientIdentityVerified?: boolean;
  clientIdentityLoading?: boolean;
};

function requestQuoteHref(entry: HireFavoriteEntry) {
  if (entry.featuredServiceId) {
    return `/hire/quote?serviceId=${encodeURIComponent(entry.featuredServiceId)}&freelancerId=${encodeURIComponent(entry.id)}`;
  }
  return `/hire/search/${entry.id}`;
}

export default function HireFavoriteCard({
  entry,
  isFavorite,
  onToggleFavorite,
  onMessage,
  clientIdentityVerified = true,
  clientIdentityLoading = false,
}: HireFavoriteCardProps) {
  const { t, formatVnd, formatDate } = useTranslation();

  const avatarSrc = resolveAvatarSrc(entry.avatarUrl);
  const initials = getUserInitials(entry.name, entry.email ?? undefined);
  const rating =
    entry.ratingAvg != null && entry.ratingAvg > 0 ? Number(entry.ratingAvg).toFixed(1) : null;

  const needsVerify = !clientIdentityLoading && !clientIdentityVerified;
  const quoteHref = needsVerify ? CLIENT_VERIFY_PAGE : requestQuoteHref(entry);
  const quoteLabel = needsVerify ? t("hirePage.verifyToQuote") : t("hirePage.requestQuote");

  return (
    <article className="hire-favorites__card">
      <div className="hire-favorites__card-main">
        <FreelancerAvatarFrame
          completedJobs={entry.completedJobs}
          size={56}
          src={avatarSrc}
          alt={entry.name}
          fallback={initials}
          imgClassName="hire-favorites__avatar-img"
          className="hire-favorites__avatar"
        />

        <div className="hire-favorites__card-body">
          <div className="hire-favorites__card-head">
            <div className="hire-favorites__identity">
              <h2 className="hire-favorites__name">
                <Link href={`/hire/search/${entry.id}`} className="hire-favorites__name-link">
                  {entry.name}
                </Link>
              </h2>
              {entry.title ? <p className="hire-favorites__title">{entry.title}</p> : null}
              <div className="hire-favorites__badges">
                {entry.sources.includes("worked") ? (
                  <span className="hire-favorites__badge hire-favorites__badge--worked">{t("hirePage.workedTogether")}</span>
                ) : null}
                {entry.sources.includes("favorite") ? (
                  <span className="hire-favorites__badge hire-favorites__badge--saved">{t("hirePage.favorite")}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className={`hire-favorites__heart${isFavorite ? " hire-favorites__heart--active" : ""}`}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? t("hirePage.removeFavorite") : t("hirePage.addFavorite")}
              onClick={() => onToggleFavorite(entry.id)}
            >
              <FaHeart aria-hidden />
            </button>
          </div>

          <dl className="hire-favorites__meta">
            {entry.districtCity ? (
              <div>
                <dt className="hire-favorites__sr-only">{t("Vị trí")}</dt>
                <dd>
                  <FaMapMarkerAlt className="hire-favorites__meta-icon" aria-hidden />
                  {entry.districtCity}
                </dd>
              </div>
            ) : null}
            {rating ? (
              <div>
                <dt className="hire-favorites__sr-only">{t("Đánh giá")}</dt>
                <dd>
                  <FaStar className="hire-favorites__meta-icon hire-favorites__meta-icon--star" aria-hidden />
                  {rating}
                  {entry.totalReviews != null && entry.totalReviews > 0
                    ? ` ${t("hirePage.reviewsCount", { count: entry.totalReviews })}`
                    : ""}
                </dd>
              </div>
            ) : null}
            {entry.hourlyRate != null ? (
              <div>
                <dt className="hire-favorites__sr-only">{t("Giá giờ")}</dt>
                <dd>{formatVnd(entry.hourlyRate)}{t("hirePage.hourly")}</dd>
              </div>
            ) : null}
            {entry.lastJobTitle ? (
              <div className="hire-favorites__meta-wide">
                <dt>{t("Gần nhất")}</dt>
                <dd>
                  {entry.lastJobTitle}
                  {entry.lastWorkedAt ? ` · ${formatDate(entry.lastWorkedAt)}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>

          {entry.skills.length > 0 ? (
            <ul className="hire-favorites__skills" aria-label={t("Kỹ năng")}>
              {entry.skills.slice(0, 6).map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="hire-favorites__actions">
        <Link href="/hire/post" className="hire-favorites__action hire-favorites__action--primary">
          <FaUserTie aria-hidden />
          {t("hirePage.hire")}
        </Link>
        {needsVerify ? (
          <Link href={CLIENT_VERIFY_PAGE} className="hire-favorites__action">
            <FaComment aria-hidden />
            {t("hirePage.verifyToMessage")}
          </Link>
        ) : (
          <button
            type="button"
            className="hire-favorites__action"
            onClick={() => onMessage(entry)}
          >
            <FaComment aria-hidden />
            {t("hirePage.message")}
          </button>
        )}
        <Link href={quoteHref} className="hire-favorites__action">
          <FaEnvelope aria-hidden />
          {quoteLabel}
        </Link>
      </div>
    </article>
  );
}
