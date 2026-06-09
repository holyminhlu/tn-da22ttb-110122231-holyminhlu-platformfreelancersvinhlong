"use client";

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
import { formatDate, formatVnd } from "@/lib/format";
import type { HireFavoriteEntry } from "./hireFavoritesTypes";

type HireFavoriteCardProps = {
  entry: HireFavoriteEntry;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export default function HireFavoriteCard({
  entry,
  isFavorite,
  onToggleFavorite,
}: HireFavoriteCardProps) {
  const avatarSrc = resolveAvatarSrc(entry.avatarUrl);
  const initials = getUserInitials(entry.name, entry.email);
  const rating =
    entry.ratingAvg != null && entry.ratingAvg > 0 ? Number(entry.ratingAvg).toFixed(1) : null;

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
                  <span className="hire-favorites__badge hire-favorites__badge--worked">Đã làm việc cùng</span>
                ) : null}
                {entry.sources.includes("favorite") ? (
                  <span className="hire-favorites__badge hire-favorites__badge--saved">My Favorites</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className={`hire-favorites__heart${isFavorite ? " hire-favorites__heart--active" : ""}`}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Bỏ khỏi My Favorites" : "Thêm vào My Favorites"}
              onClick={() => onToggleFavorite(entry.id)}
            >
              <FaHeart aria-hidden />
            </button>
          </div>

          <dl className="hire-favorites__meta">
            {entry.districtCity ? (
              <div>
                <dt className="hire-favorites__sr-only">Vị trí</dt>
                <dd>
                  <FaMapMarkerAlt className="hire-favorites__meta-icon" aria-hidden />
                  {entry.districtCity}
                </dd>
              </div>
            ) : null}
            {rating ? (
              <div>
                <dt className="hire-favorites__sr-only">Đánh giá</dt>
                <dd>
                  <FaStar className="hire-favorites__meta-icon hire-favorites__meta-icon--star" aria-hidden />
                  {rating}
                  {entry.totalReviews != null && entry.totalReviews > 0
                    ? ` (${entry.totalReviews} đánh giá)`
                    : ""}
                </dd>
              </div>
            ) : null}
            {entry.hourlyRate != null ? (
              <div>
                <dt className="hire-favorites__sr-only">Giá giờ</dt>
                <dd>{formatVnd(entry.hourlyRate)}/giờ</dd>
              </div>
            ) : null}
            {entry.lastJobTitle ? (
              <div className="hire-favorites__meta-wide">
                <dt>Gần nhất</dt>
                <dd>
                  {entry.lastJobTitle}
                  {entry.lastWorkedAt ? ` · ${formatDate(entry.lastWorkedAt)}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>

          {entry.skills.length > 0 ? (
            <ul className="hire-favorites__skills" aria-label="Kỹ năng">
              {entry.skills.slice(0, 6).map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="hire-favorites__actions">
        <Link href="/hire/joblist" className="hire-favorites__action hire-favorites__action--primary">
          <FaUserTie aria-hidden />
          Hire
        </Link>
        <button
          type="button"
          className="hire-favorites__action"
          disabled
          title="Tính năng nhắn tin đang được phát triển"
        >
          <FaComment aria-hidden />
          Message
        </button>
        <Link href="/hire/quotes" className="hire-favorites__action">
          <FaEnvelope aria-hidden />
          Request Quote
        </Link>
      </div>
    </article>
  );
}
