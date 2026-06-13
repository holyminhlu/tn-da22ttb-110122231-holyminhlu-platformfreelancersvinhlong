"use client";

import Image from "next/image";
import Link from "next/link";
import { FaListUl, FaMoneyBillWave, FaThumbsUp } from "react-icons/fa";
import type { JobListing } from "@/lib/api/jobs";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import {
  clientDisplayName,
  clientLocationLabel,
  formatCompactVnd,
  formatJobBudgetLine,
  jobStatusLabel,
  parseJobTags,
  quotesCountLabel,
  relativePosted,
} from "@/lib/jobsDisplay";

type HireJoblistCardProps = {
  job: JobListing;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
};

export default function HireJoblistCard({ job, selected, onSelect }: HireJoblistCardProps) {
  const tags = parseJobTags(job.tags);
  const categoryLabel = job.category?.trim() || null;
  const quoteCount = job.quote_count ?? 0;
  const avatarSrc = resolveAvatarSrc(job.client_avatar_url);
  const employerName = clientDisplayName(job.client_name);
  const employerLocation = clientLocationLabel(job);
  const spent = formatCompactVnd(job.client_total_spent ?? 0);
  const satisfaction = job.client_satisfaction_score;
  const budgetLine = formatJobBudgetLine(job);

  return (
    <article className="hire-joblist__card">
      <div className="hire-joblist__card-top-row">
        <label className="hire-joblist__meta">
          <input
            type="checkbox"
            className="hire-joblist__checkbox"
            checked={selected}
            onChange={(e) => onSelect(job.id, e.target.checked)}
            aria-label={`Chọn ${job.title}`}
          />
          <span>
            {relativePosted(job.created_at)} · {quotesCountLabel(quoteCount)}
          </span>
        </label>
        <span className={`hire-joblist__status hire-joblist__status--${job.status}`}>
          {jobStatusLabel(job.status)}
        </span>
      </div>

      <h2 className="hire-joblist__title">
        <Link href={`/work/detail/${job.id}`}>{job.title}</Link>
      </h2>

      <p className="hire-joblist__budget">{budgetLine}</p>

      <p className="hire-joblist__desc">{job.description?.trim() || "—"}</p>

      {categoryLabel || tags.length > 0 ? (
        <div className="hire-joblist__tags">
          {categoryLabel ? (
            <span className="hire-joblist__category">
              <FaListUl aria-hidden />
              {categoryLabel}
            </span>
          ) : null}
          {tags.map((tag) => (
            <span key={tag} className="hire-joblist__tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="hire-joblist__employer">
        <div className="hire-joblist__employer-avatar" aria-hidden>
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt=""
              width={40}
              height={40}
              className="hire-joblist__employer-img"
              unoptimized
            />
          ) : (
            <span className="hire-joblist__employer-fallback">
              {getUserInitials(job.client_name ?? undefined)}
            </span>
          )}
        </div>
        <div className="hire-joblist__employer-text">
          <p className="hire-joblist__employer-name">{employerName}</p>
          <p className="hire-joblist__employer-location">{employerLocation}</p>
        </div>
        <div className="hire-joblist__employer-stats">
          {spent ? (
            <span className="hire-joblist__spent">
              <FaMoneyBillWave aria-hidden />
              Đã chi {spent}
            </span>
          ) : null}
          {satisfaction != null && satisfaction > 0 ? (
            <span className="hire-joblist__satisfaction">
              <FaThumbsUp aria-hidden />
              {Math.min(100, Math.round(satisfaction))}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="hire-joblist__card-actions">
        <Link href={`/hire/joblist/${job.id}`} className="hire-joblist__link-btn">
          Quản lý tuyển dụng
        </Link>
        <Link href="/hire/quotes" className="hire-joblist__link-btn">
          Tất cả báo giá
        </Link>
        <Link href={`/work/detail/${job.id}`} className="hire-joblist__link-btn hire-joblist__link-btn--muted">
          Chi tiết
        </Link>
      </div>
    </article>
  );
}
