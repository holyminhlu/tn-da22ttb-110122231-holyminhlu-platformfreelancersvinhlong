"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
  FaChevronDown,
  FaExternalLinkAlt,
  FaHeart,
  FaImage,
  FaLaptopCode,
  FaListUl,
  FaPaperclip,
  FaPlayCircle,
  FaStar,
  FaThumbsUp,
  FaUser,
} from "react-icons/fa";
import {
  getFreelancer,
  type FreelancerProfilePayload,
  type FreelancerSearchRow,
} from "@/lib/api/freelancers";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import {
  displayMembershipBadges,
  featuredDescription,
  featuredServiceTitle,
  formatHourlyRate,
  formatStartingPrice,
  formatYearlyEarnings,
  locationDisplay,
  minProjectPrice,
  parseProfileBadges,
  resolveFreelancerMedia,
  satisfactionPercent,
} from "@/lib/hire/freelancerSearchDisplay";
import { formatDate } from "@/lib/format";

type DetailTab = "services" | "portfolio" | "performance" | "about";

type HireSearchFreelancerCardProps = {
  row: FreelancerSearchRow;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export default function HireSearchFreelancerCard({
  row,
  selected,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: HireSearchFreelancerCardProps) {
  const [openTab, setOpenTab] = useState<DetailTab | null>(null);
  const [detail, setDetail] = useState<FreelancerProfilePayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const avatarSrc = resolveAvatarSrc(row.avatar_url);
  const thumbSrc = resolveFreelancerMedia(row.featured_service_thumbnail);
  const badges = displayMembershipBadges(parseProfileBadges(row.profile_badges));
  const hourly = formatHourlyRate(row.hourly_rate);
  const starting = formatStartingPrice(minProjectPrice(row));
  const satisfaction = satisfactionPercent(row);
  const serviceTitle = featuredServiceTitle(row);
  const category =
    row.featured_service_category?.trim() ||
    row.skills[0] ||
    "Programming & Development";

  const loadDetail = useCallback(async () => {
    if (detail) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const payload = await getFreelancer(row.id, row.featured_service_id ?? undefined);
      setDetail(payload);
    } catch {
      setDetailError("Không thể tải chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  }, [detail, row.id, row.featured_service_id]);

  async function handleTabClick(tab: DetailTab) {
    if (openTab === tab) {
      setOpenTab(null);
      return;
    }
    setOpenTab(tab);
    await loadDetail();
  }

  const tabs: {
    id: DetailTab;
    icon: typeof FaPaperclip;
    label: string;
    rotate?: boolean;
  }[] = [
    {
      id: "services",
      icon: FaPaperclip,
      label: `More Services (${row.services_count})`,
      rotate: true,
    },
    { id: "portfolio", icon: FaImage, label: `Portfolio (${row.portfolio_count})` },
    { id: "performance", icon: FaThumbsUp, label: "Performance" },
    { id: "about", icon: FaUser, label: "About" },
  ];

  return (
    <article className="hire-search__card">
      <div className="hire-search__card-inner">
        <div className="hire-search__checkbox-col">
          <input
            type="checkbox"
            className="hire-search__checkbox"
            checked={selected}
            onChange={(e) => onSelect(row.id, e.target.checked)}
            aria-label={`Chọn ${row.full_name}`}
          />
        </div>

        <div className="hire-search__card-content">
          <div className="hire-search__card-top">
            <div className="hire-search__identity">
              <div className="hire-search__logo">
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt=""
                    width={48}
                    height={48}
                    className="hire-search__logo-img"
                    unoptimized
                  />
                ) : (
                  <span className="hire-search__logo-fallback">
                    {getUserInitials(row.full_name)}
                  </span>
                )}
              </div>
              <div className="hire-search__identity-text">
                <h2 className="hire-search__freelancer-name">
                  <Link
                    href={
                      row.featured_service_id
                        ? `/hire/search/${row.id}?service=${encodeURIComponent(row.featured_service_id)}`
                        : `/hire/search/${row.id}`
                    }
                  >
                    {row.full_name}
                  </Link>
                  {badges.map((badge) => (
                    <span key={badge} className="hire-search__member-badge">
                      {badge.toUpperCase()}
                    </span>
                  ))}
                  {row.has_demo_video ? (
                    <FaPlayCircle className="hire-search__video-icon" aria-label="Có video giới thiệu" />
                  ) : null}
                </h2>
                <p className="hire-search__location">{locationDisplay(row)}</p>
                <div className="hire-search__stats">
                  <span className="hire-search__earnings">{formatYearlyEarnings(row.total_earnings)}</span>
                  {satisfaction > 0 ? (
                    <span className="hire-search__rating">
                      <FaThumbsUp aria-hidden />
                      {satisfaction}%
                    </span>
                  ) : (
                    <span className="hire-search__rating hire-search__rating--muted">Chưa có đánh giá</span>
                  )}
                </div>
              </div>
            </div>

            <div className="hire-search__card-actions">
              <button
                type="button"
                className={`hire-search__heart${isFavorite ? " hire-search__heart--active" : ""}`}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào My Favorites"}
                onClick={() => onToggleFavorite(row.id)}
              >
                <FaHeart aria-hidden />
              </button>
              <Link
                href={
                  row.featured_service_id
                    ? `/hire/quote?serviceId=${encodeURIComponent(row.featured_service_id)}&freelancerId=${encodeURIComponent(row.id)}`
                    : `/hire/search/${row.id}`
                }
                className="hire-search__quote-btn"
              >
                Get a Quote
              </Link>
            </div>
          </div>

          <div className="hire-search__service-row">
            <div className="hire-search__thumbnail">
              {thumbSrc ? (
                <Image
                  src={thumbSrc}
                  alt=""
                  width={320}
                  height={160}
                  className="hire-search__thumbnail-img"
                  unoptimized
                />
              ) : (
                <FaLaptopCode className="hire-search__thumbnail-placeholder" aria-hidden />
              )}
            </div>
            <div className="hire-search__service-body">
              <div className="hire-search__service-headline">
                <span className="hire-search__service-title">{serviceTitle}</span>
                {hourly ? <span className="hire-search__service-rate">{hourly}</span> : null}
                {starting ? <span className="hire-search__service-min">{starting}</span> : null}
              </div>
              <p className="hire-search__service-desc">{featuredDescription(row)}</p>
              <div className="hire-search__tags">
                <span className="hire-search__category">
                  <FaListUl aria-hidden />
                  {category}
                </span>
                {row.skills.map((skill) => (
                  <span key={skill} className="hire-search__skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hire-search__tabs" role="tablist" aria-label={`Chi tiết ${row.full_name}`}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={openTab === tab.id}
            className={`hire-search__tab${openTab === tab.id ? " hire-search__tab--open" : ""}${
              index < tabs.length - 1 ? " hire-search__tab--border" : ""
            }`}
            onClick={() => void handleTabClick(tab.id)}
          >
            <tab.icon
              className={`hire-search__tab-icon${tab.rotate ? " hire-search__tab-icon--rotate" : ""}`}
              aria-hidden
            />
            {tab.label}
            <FaChevronDown className="hire-search__tab-chevron" aria-hidden />
          </button>
        ))}
      </div>

      {openTab ? (
        <div className="hire-search__detail-panel" role="tabpanel">
            {detailLoading ? (
              <div className="hire-search__detail-loading" aria-busy="true">
                <span className="hire-search__detail-loading-bar" />
                <span className="hire-search__detail-loading-bar hire-search__detail-loading-bar--short" />
                <span className="hire-search__detail-loading-bar hire-search__detail-loading-bar--medium" />
              </div>
            ) : null}
            {detailError ? (
              <p className="hire-search__detail-error" role="alert">
                {detailError}
              </p>
            ) : null}

            {!detailLoading && !detailError && openTab === "services" ? (
              (detail?.services ?? []).length === 0 ? (
                <p className="hire-search__detail-empty">Freelancer chưa đăng thêm dịch vụ nào.</p>
              ) : (
                <ul className="hire-search__service-grid">
                  {(detail?.services ?? []).map((svc) => {
                    const priceLabel = formatStartingPrice(svc.price);
                    return (
                      <li key={svc.id} className="hire-search__service-item">
                        <h3 className="hire-search__service-item-title">{svc.title}</h3>
                        {svc.category ? (
                          <p className="hire-search__service-item-meta">{svc.category}</p>
                        ) : null}
                        <div className="hire-search__service-item-foot">
                          {priceLabel ? (
                            <span className="hire-search__service-item-price">{priceLabel}</span>
                          ) : null}
                          {svc.delivery_days != null ? (
                            <span className="hire-search__service-item-days">
                              {svc.delivery_days} ngày
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}

            {!detailLoading && !detailError && openTab === "portfolio" ? (
              (detail?.portfolio ?? []).length === 0 ? (
                <p className="hire-search__detail-empty">Chưa có mục portfolio.</p>
              ) : (
                <ul className="hire-search__portfolio-list">
                  {(detail?.portfolio ?? []).map((item) => (
                    <li key={item.id} className="hire-search__portfolio-item">
                      <div className="hire-search__portfolio-item-icon" aria-hidden>
                        <FaImage />
                      </div>
                      <div className="hire-search__portfolio-item-body">
                        <h3 className="hire-search__portfolio-item-title">{item.title}</h3>
                        {item.description ? (
                          <p className="hire-search__portfolio-item-desc">{item.description}</p>
                        ) : null}
                        {item.project_url ? (
                          <a
                            href={item.project_url}
                            className="hire-search__portfolio-item-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Xem dự án <FaExternalLinkAlt aria-hidden />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : null}

            {!detailLoading && !detailError && openTab === "performance" ? (
              <>
                <div className="hire-search__perf-grid">
                  <div className="hire-search__perf-stat">
                    <span className="hire-search__perf-stat-value">
                      {satisfaction > 0 ? `${satisfaction}%` : "—"}
                    </span>
                    <span className="hire-search__perf-stat-label">Tỷ lệ hài lòng</span>
                  </div>
                  <div className="hire-search__perf-stat">
                    <span className="hire-search__perf-stat-value">
                      {row.rating_avg > 0 ? Number(row.rating_avg).toFixed(1) : "—"}
                    </span>
                    <span className="hire-search__perf-stat-label">
                      Đánh giá TB
                      {row.total_reviews > 0 ? ` (${row.total_reviews})` : ""}
                    </span>
                  </div>
                  <div className="hire-search__perf-stat">
                    <span className="hire-search__perf-stat-value">{row.completed_jobs}</span>
                    <span className="hire-search__perf-stat-label">Hợp đồng hoàn thành</span>
                  </div>
                  {row.job_success_score != null ? (
                    <div className="hire-search__perf-stat">
                      <span className="hire-search__perf-stat-value">{row.job_success_score}%</span>
                      <span className="hire-search__perf-stat-label">Job Success</span>
                    </div>
                  ) : null}
                </div>
                {(detail?.reviews ?? []).length > 0 ? (
                  <div className="hire-search__reviews-block">
                    <h3 className="hire-search__reviews-heading">Đánh giá gần đây</h3>
                    <ul className="hire-search__reviews-list">
                      {detail!.reviews.slice(0, 5).map((review) => (
                        <li key={review.id} className="hire-search__review-card">
                          <div className="hire-search__review-card-head">
                            <span className="hire-search__review-stars" aria-label={`${review.rating} sao`}>
                              {Array.from({ length: 5 }, (_, i) => (
                                <FaStar
                                  key={i}
                                  className={
                                    i < review.rating
                                      ? "hire-search__review-star hire-search__review-star--on"
                                      : "hire-search__review-star"
                                  }
                                  aria-hidden
                                />
                              ))}
                            </span>
                            <span className="hire-search__review-author">
                              {review.client_name || "Client"}
                            </span>
                            <time className="hire-search__review-date" dateTime={review.created_at}>
                              {formatDate(review.created_at)}
                            </time>
                          </div>
                          {review.comment ? (
                            <p className="hire-search__review-comment">{review.comment}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="hire-search__detail-empty hire-search__detail-empty--inline">
                    Chưa có đánh giá từ client.
                  </p>
                )}
              </>
            ) : null}

            {!detailLoading && !detailError && openTab === "about" ? (
              <div className="hire-search__about">
                <p className="hire-search__about-bio">
                  {detail?.freelancer.bio?.trim() || row.bio?.trim() || "Chưa có giới thiệu."}
                </p>
                <dl className="hire-search__about-meta">
                  {row.experience_years != null ? (
                    <div className="hire-search__about-meta-item">
                      <dt>Kinh nghiệm</dt>
                      <dd>{row.experience_years} năm</dd>
                    </div>
                  ) : null}
                  {row.avg_response_minutes ? (
                    <div className="hire-search__about-meta-item">
                      <dt>Phản hồi</dt>
                      <dd>~{row.avg_response_minutes} phút</dd>
                    </div>
                  ) : null}
                  {row.title?.trim() ? (
                    <div className="hire-search__about-meta-item">
                      <dt>Chức danh</dt>
                      <dd>{row.title.trim()}</dd>
                    </div>
                  ) : null}
                  {locationDisplay(row) !== "—" ? (
                    <div className="hire-search__about-meta-item">
                      <dt>Địa điểm</dt>
                      <dd>{locationDisplay(row)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
        </div>
      ) : null}
    </article>
  );
}
