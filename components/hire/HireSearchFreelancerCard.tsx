"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaChevronDown,
  FaExternalLinkAlt,
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
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
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
  parsePortfolioImageUrls,
  resolveFreelancerMedia,
  satisfactionPercent,
} from "@/lib/hire/freelancerSearchDisplay";
import { CLIENT_VERIFY_PAGE } from "@/lib/hire/clientVerification";
import FreelancerLikeButton from "./FreelancerLikeButton";

type DetailTab = "services" | "portfolio" | "performance" | "about";

type HireSearchFreelancerCardProps = {
  row: FreelancerSearchRow;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  isFavorite: boolean;
  favoriteCount: number;
  onToggleFavorite: (id: string) => void | Promise<void>;
  /** Khách chưa đăng nhập — xem công khai, thuê qua đăng nhập. */
  guestMode?: boolean;
  /** Client đã hoàn tất xác minh danh tính. */
  clientIdentityVerified?: boolean;
  clientIdentityLoading?: boolean;
  /** Liên kết hồ sơ dùng /freelancers thay vì /hire/search. */
  publicProfile?: boolean;
};

const MODAL_META: Record<DetailTab, { title: string; closeLabel: string }> = {
  services: { title: tUi("Dịch vụ"), closeLabel: tUi("Đóng danh sách dịch vụ") },
  portfolio: { title: tUi("Hồ sơ dự án"), closeLabel: tUi("Đóng hồ sơ dự án") },
  performance: { title: tUi("Hiệu suất"), closeLabel: tUi("Đóng hiệu suất") },
  about: { title: tUi("Giới thiệu"), closeLabel: tUi("Đóng giới thiệu") },
};

type ModalStat = { label: string; value: string; sub?: string };

function buildPerformanceStats(row: FreelancerSearchRow, satisfaction: number): ModalStat[] {
  const stats: ModalStat[] = [];
  if (satisfaction > 0) {
    stats.push({ label: tUi("Tỷ lệ hài lòng"), value: `${satisfaction}%` });
  }
  const ratingAvg = row.rating_avg > 0 ? Number(row.rating_avg) : 0;
  if (ratingAvg > 0) {
    stats.push({
      label: tUi("Đánh giá trung bình"),
      value: `${ratingAvg.toFixed(1)} / 5`,
      sub: row.total_reviews > 0 ? `${row.total_reviews} đánh giá` : undefined,
    });
  }
  stats.push({ label: tUi("Hợp đồng hoàn thành"), value: String(row.completed_jobs) });
  if (row.job_success_score != null) {
    stats.push({ label: tUi("Tỷ lệ thành công"), value: `${row.job_success_score}%` });
  }
  if (row.avg_response_minutes) {
    stats.push({ label: tUi("Phản hồi trung bình"), value: `~${row.avg_response_minutes} phút` });
  }
  const earnings = formatYearlyEarnings(row.total_earnings);
  stats.push({
    label: tUi("Thu nhập trên VLC"),
    value: earnings !== "—" ? earnings : "0 ₫ /năm",
  });
  return stats;
}

function renderStatGrid(stats: ModalStat[]) {
  if (stats.length === 0) return null;
  return (
    <dl className="hire-modal-stat-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="hire-modal-stat-grid__item">
          <dd className="hire-modal-stat-grid__value">{stat.value}</dd>
          {stat.sub ? <span className="hire-modal-stat-grid__sub">{stat.sub}</span> : null}
          <dt className="hire-modal-stat-grid__label">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function renderReviewList(
  reviews: FreelancerProfilePayload["reviews"],
  emptyText: string,
) {

  const t = tUi;
  const formatDate = formatDateUi;
  if (reviews.length === 0) {
    return <p className="hire-modal-panel__hint">{emptyText}</p>;
  }
  return (
    <div className="hire-search__reviews-block">
      <h4 className="hire-search__reviews-heading">{tUi("Đánh giá gần đây")}</h4>
      <ul className="hire-search__reviews-list">
        {reviews.slice(0, 5).map((review) => (
          <li key={review.id} className="hire-search__review-card">
            <div className="hire-search__review-card-head">
              <span className="hire-search__review-stars" aria-label={`${review.rating} sao`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <FaStar
                    key={i}
                    className={`hire-search__review-star${
                      i < review.rating ? " hire-search__review-star--on" : ""
                    }`}
                  />
                ))}
              </span>
              <span className="hire-search__review-author">{review.client_name || tUi("Khách hàng")}</span>
              <span className="hire-search__review-date">{formatDateUi(review.created_at)}</span>
            </div>
            {review.comment?.trim() ? (
              <p className="hire-search__review-comment">{review.comment.trim()}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HireSearchFreelancerCard({
  row,
  selected,
  onSelect,
  isFavorite,
  favoriteCount,
  onToggleFavorite,
  guestMode = false,
  clientIdentityVerified = true,
  clientIdentityLoading = false,
  publicProfile = false,
}: HireSearchFreelancerCardProps) {
  const { t, formatDate } = useTranslation();

  const [activeModal, setActiveModal] = useState<DetailTab | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
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
    row.skills[0] || t("Lập trình & phát triển");

  const profileBase = publicProfile ? "/freelancers" : "/hire/search";

  function profileHref(serviceId?: string | null) {
  const t = tUi;
    if (serviceId) {
      return `${profileBase}/${row.id}?service=${encodeURIComponent(serviceId)}`;
    }
    return `${profileBase}/${row.id}`;
  }

  function quoteHref(serviceId?: string | null) {
  const t = tUi;
    const target = serviceId
      ? `/hire/quote?serviceId=${encodeURIComponent(serviceId)}&freelancerId=${encodeURIComponent(row.id)}`
      : profileHref(serviceId);
    if (guestMode) {
      return `/dang-nhap?next=${encodeURIComponent(target)}`;
    }
    if (!clientIdentityLoading && !clientIdentityVerified) {
      return CLIENT_VERIFY_PAGE;
    }
    return serviceId
      ? `/hire/quote?serviceId=${encodeURIComponent(serviceId)}&freelancerId=${encodeURIComponent(row.id)}`
      : profileHref(serviceId);
  }

  const quoteLabel = guestMode
    ? "Đăng nhập để thuê"
    : !clientIdentityLoading && !clientIdentityVerified
      ? "Xác minh để báo giá"
      : "Yêu cầu báo giá";

  function favoriteHref() {
  const t = tUi;
    return `/dang-nhap?next=${encodeURIComponent("/freelancers")}`;
  }

  const loadDetail = useCallback(async () => {
    if (detail) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const payload = await getFreelancer(row.id, row.featured_service_id ?? undefined);
      setDetail(payload);
    } catch {
      setDetailError(t("Không thể tải chi tiết."));
    } finally {
      setDetailLoading(false);
    }
  }, [detail, row.id, row.featured_service_id]);

  async function handleTabClick(tab: DetailTab) {
  const t = tUi;
    if (activeModal === tab) {
      setActiveModal(null);
      setSelectedPortfolioId(null);
      return;
    }
    setSelectedPortfolioId(null);
    setActiveModal(tab);
    await loadDetail();
  }

  function closeModal() {
  const t = tUi;
    setActiveModal(null);
    setSelectedPortfolioId(null);
  }

  useEffect(() => {
    if (!activeModal) return;
    function onKeyDown(event: KeyboardEvent) {
  const t = tUi;
      if (event.key === "Escape") {
        if (selectedPortfolioId) {
          setSelectedPortfolioId(null);
        } else {
          setActiveModal(null);
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeModal, selectedPortfolioId]);

  const tabs: {
    id: DetailTab;
    icon: typeof FaPaperclip;
    label: string;
    rotate?: boolean;
  }[] = [
    {
      id: "services",
      icon: FaPaperclip,
      label: `Dịch vụ (${row.services_count})`,
      rotate: true,
    },
    { id: "portfolio", icon: FaImage, label: `Hồ sơ dự án (${row.portfolio_count})` },
    { id: "performance", icon: FaThumbsUp, label: t("Hiệu suất") },
    { id: "about", icon: FaUser, label: t("Giới thiệu") },
  ];

  function renderModalContent() {
  const t = tUi;
    if (detailLoading) {
      return (
        <div className="hire-search__detail-loading" aria-busy="true">
          <span className="hire-search__detail-loading-bar" />
          <span className="hire-search__detail-loading-bar hire-search__detail-loading-bar--short" />
          <span className="hire-search__detail-loading-bar hire-search__detail-loading-bar--medium" />
        </div>
      );
    }

    if (detailError) {
      return (
        <p className="hire-search__detail-error" role="alert">
          {detailError}
        </p>
      );
    }

    if (activeModal === "services") {
      if ((detail?.services ?? []).length === 0) {
        return (
          <div className="hire-modal-empty">
            <FaPaperclip className="hire-modal-empty__icon" aria-hidden />
            <p>{t("Freelancer chưa đăng thêm dịch vụ nào.")}</p>
          </div>
        );
      }
      return (
        <ul className="hire-modal-list">
          {(detail?.services ?? []).map((svc) => {
            const priceLabel = formatStartingPrice(svc.price);
            const meta = [
              priceLabel,
              svc.delivery_days != null ? `${svc.delivery_days} ngày giao hàng` : null,
              svc.category,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={svc.id}>
                <Link href={profileHref(svc.id)} className="hire-modal-list__link">
                  <span className="hire-modal-list__title">{svc.title}</span>
                  {meta ? <span className="hire-modal-list__meta">{meta}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      );
    }

    if (activeModal === "portfolio") {
      if ((detail?.portfolio ?? []).length === 0) {
        return (
          <div className="hire-modal-empty">
            <FaImage className="hire-modal-empty__icon" aria-hidden />
            <p>{t("Chưa có mục portfolio.")}</p>
          </div>
        );
      }
      const selectedItem = selectedPortfolioId
        ? (detail?.portfolio ?? []).find((p) => p.id === selectedPortfolioId)
        : null;

      if (selectedItem) {
        const images = parsePortfolioImageUrls(selectedItem.images);
        const desc =
          selectedItem.description?.trim() || t("Freelancer chưa thêm mô tả cho dự án này.");

        return (
          <div className="hire-modal-panel hire-modal-portfolio-detail">
            <button
              type="button"
              className="hire-modal-panel__back"
              onClick={() => setSelectedPortfolioId(null)}
            >
              ← Danh sách portfolio
            </button>
            <h4 className="hire-modal-portfolio-detail__title">{selectedItem.title}</h4>
            <p className="hire-modal-portfolio-detail__desc">{desc}</p>
            {images.length > 0 ? (
              <ul className="hire-modal-portfolio-detail__gallery">
                {images.map((src, index) => (
                  <li key={`${selectedItem.id}-${index}`}>
                    <Image
                      src={src}
                      alt=""
                      width={480}
                      height={280}
                      className="hire-modal-portfolio-detail__img"
                      unoptimized
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hire-modal-panel__hint">{t("Chưa có hình ảnh đính kèm.")}</p>
            )}
            {selectedItem.project_url ? (
              <a
                href={selectedItem.project_url}
                className="hire-modal-portfolio-detail__link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Xem dự án trực tuyến
                <FaExternalLinkAlt aria-hidden />
              </a>
            ) : null}
          </div>
        );
      }

      return (
        <ul className="hire-modal-list">
          {(detail?.portfolio ?? []).map((item) => {
            const images = parsePortfolioImageUrls(item.images);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="hire-modal-list__btn"
                  onClick={() => setSelectedPortfolioId(item.id)}
                >
                  <span className="hire-modal-list__title">{item.title}</span>
                  {images.length > 0 ? (
                    <span className="hire-modal-list__meta">{images.length} hình ảnh</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      );
    }

    if (activeModal === "performance") {
      const perfStats = buildPerformanceStats(row, satisfaction);
      const reviews = detail?.reviews ?? [];

      return (
        <div className="hire-modal-panel hire-modal-panel--centered">
          {perfStats.length > 0 ? (
            renderStatGrid(perfStats)
          ) : (
            <p className="hire-modal-panel__hint">{t("Chưa có thống kê hiệu suất.")}</p>
          )}
          {renderReviewList(reviews, "Chưa có đánh giá từ client.")}
        </div>
      );
    }

    if (activeModal === "about") {
      const bio =
        detail?.freelancer.bio?.trim() || row.bio?.trim() || t("Freelancer chưa cập nhật phần giới thiệu.");

      const aboutStats: ModalStat[] = [];
      if (row.title?.trim()) {
        aboutStats.push({ label: t("Chức danh"), value: row.title.trim() });
      }
      if (locationDisplay(row) !== "—") {
        aboutStats.push({ label: t("Khu vực"), value: locationDisplay(row) });
      }
      if (row.experience_years != null) {
        aboutStats.push({ label: t("Kinh nghiệm"), value: `${row.experience_years}+ năm` });
      }
      if (row.avg_response_minutes) {
        aboutStats.push({ label: t("Phản hồi TB"), value: `~${row.avg_response_minutes} phút` });
      }
      if (row.services_count > 0) {
        aboutStats.push({ label: t("Dịch vụ"), value: String(row.services_count) });
      }
      if (row.portfolio_count > 0) {
        aboutStats.push({ label: t("Hồ sơ dự án"), value: String(row.portfolio_count) });
      }

      return (
        <div className="hire-modal-panel hire-modal-panel--centered">
          <p className="hire-search__about-bio hire-search__about-bio--center">{bio}</p>
          {renderStatGrid(aboutStats)}
          {row.skills.length > 0 ? (
            <div className="hire-modal-tags hire-modal-tags--center">
              {row.skills.map((skill) => (
                <span key={skill} className="hire-modal-tags__item">
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
          <div className="hire-modal-panel__actions hire-modal-panel__actions--center">
            <Link href={profileHref()} className="hire-search__about-profile-link">
              Xem hồ sơ đầy đủ
            </Link>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <article className="hire-search__card">
      <div className="hire-search__card-inner">
        {!guestMode ? (
          <div className="hire-search__checkbox-col">
            <input
              type="checkbox"
              className="hire-search__checkbox"
              checked={selected}
              onChange={(e) => onSelect(row.id, e.target.checked)}
              aria-label={`Chọn ${row.full_name}`}
            />
          </div>
        ) : null}

        <div className="hire-search__card-content">
          <div className="hire-search__card-top">
            <div className="hire-search__identity">
              <FreelancerAvatarFrame
                completedJobs={row.completed_jobs}
                size={48}
                src={avatarSrc}
                alt={row.full_name}
                fallback={getUserInitials(row.full_name)}
                imgClassName="hire-search__logo-img"
                className="hire-search__logo"
              />
              <div className="hire-search__identity-text">
                <h2 className="hire-search__freelancer-name">
                  <Link href={profileHref(row.featured_service_id)}>
                    {row.full_name}
                  </Link>
                  {badges.map((badge) => (
                    <span key={badge} className="hire-search__member-badge">
                      {badge.toUpperCase()}
                    </span>
                  ))}
                  {row.has_demo_video ? (
                    <FaPlayCircle className="hire-search__video-icon" aria-label={t("Có video giới thiệu")} />
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
                    <span className="hire-search__rating hire-search__rating--muted">{t("Chưa có đánh giá")}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="hire-search__card-actions">
              <FreelancerLikeButton
                freelancerId={row.id}
                isFavorite={isFavorite}
                favoriteCount={favoriteCount}
                onToggle={onToggleFavorite}
                guestHref={guestMode ? favoriteHref() : undefined}
                compact
              />
              <Link
                href={quoteHref(row.featured_service_id)}
                className="hire-search__quote-btn"
              >
                {quoteLabel}
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
            aria-selected={activeModal === tab.id}
            className={`hire-search__tab${
              activeModal === tab.id ? " hire-search__tab--open" : ""
            }${index < tabs.length - 1 ? " hire-search__tab--border" : ""}`}
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

      {activeModal ? (
        <div className="hire-search__detail-modal-backdrop" role="presentation">
          <div
            className="hire-search__detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${MODAL_META[activeModal].title} — ${row.full_name}`}
          >
            <header className="hire-modal-simple-head">
              <h3 className="hire-modal-simple-head__title">
                {MODAL_META[activeModal].title} — {row.full_name}
              </h3>
              <button
                type="button"
                className="hire-modal-simple-head__close"
                aria-label={MODAL_META[activeModal].closeLabel}
                onClick={closeModal}
              >
                ×
              </button>
            </header>
            <div className="hire-search__detail-modal-body">{renderModalContent()}</div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
