"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaBriefcase,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaExternalLinkAlt,
  FaHeart,
  FaImage,
  FaLaptopCode,
  FaListUl,
  FaMapMarkerAlt,
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
  parsePortfolioImageUrls,
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
  /** Khách chưa đăng nhập — xem công khai, thuê qua đăng nhập. */
  guestMode?: boolean;
  /** Liên kết hồ sơ dùng /freelancers thay vì /hire/search. */
  publicProfile?: boolean;
};

const MODAL_META: Record<
  DetailTab,
  {
    title: string;
    headline: string;
    subtitle: (row: FreelancerSearchRow) => string;
    closeLabel: string;
    accent: string;
  }
> = {
  services: {
    title: "Dịch vụ",
    headline: "Bộ dịch vụ chuyên nghiệp",
    subtitle: (row) =>
      `${row.full_name} cung cấp ${row.services_count} gói dịch vụ — chọn phù hợp nhu cầu và ngân sách của bạn.`,
    closeLabel: "Đóng cửa sổ dịch vụ",
    accent: "services",
  },
  portfolio: {
    title: "Portfolio",
    headline: "Dự án & thành tựu",
    subtitle: (row) =>
      `${row.portfolio_count} dự án tiêu biểu thể hiện chất lượng và phong cách làm việc của ${row.full_name}.`,
    closeLabel: "Đóng cửa sổ portfolio",
    accent: "portfolio",
  },
  performance: {
    title: "Hiệu suất",
    headline: "Uy tín trên nền tảng",
    subtitle: (row) => `Thống kê thực tế từ hợp đồng và đánh giá của ${row.full_name}.`,
    closeLabel: "Đóng cửa sổ hiệu suất",
    accent: "performance",
  },
  about: {
    title: "Giới thiệu",
    headline: "Làm quen với chuyên gia",
    subtitle: (row) =>
      `Tìm hiểu kinh nghiệm, phong cách và lý do nên hợp tác cùng ${row.full_name}.`,
    closeLabel: "Đóng cửa sổ giới thiệu",
    accent: "about",
  },
};

export default function HireSearchFreelancerCard({
  row,
  selected,
  onSelect,
  isFavorite,
  onToggleFavorite,
  guestMode = false,
  publicProfile = false,
}: HireSearchFreelancerCardProps) {
  const [activeModal, setActiveModal] = useState<DetailTab | null>(null);
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

  const profileBase = publicProfile ? "/freelancers" : "/hire/search";

  function profileHref(serviceId?: string | null) {
    if (serviceId) {
      return `${profileBase}/${row.id}?service=${encodeURIComponent(serviceId)}`;
    }
    return `${profileBase}/${row.id}`;
  }

  function quoteHref(serviceId?: string | null) {
    const target = serviceId
      ? `/hire/quote?serviceId=${encodeURIComponent(serviceId)}&freelancerId=${encodeURIComponent(row.id)}`
      : profileHref(serviceId);
    if (guestMode) {
      return `/dang-nhap?next=${encodeURIComponent(target)}`;
    }
    return serviceId
      ? `/hire/quote?serviceId=${encodeURIComponent(serviceId)}&freelancerId=${encodeURIComponent(row.id)}`
      : profileHref(serviceId);
  }

  function favoriteHref() {
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
      setDetailError("Không thể tải chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  }, [detail, row.id, row.featured_service_id]);

  async function handleTabClick(tab: DetailTab) {
    if (activeModal === tab) {
      setActiveModal(null);
      return;
    }
    setActiveModal(tab);
    await loadDetail();
  }

  function closeModal() {
    setActiveModal(null);
  }

  useEffect(() => {
    if (!activeModal) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeModal]);

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
    { id: "portfolio", icon: FaImage, label: `Portfolio (${row.portfolio_count})` },
    { id: "performance", icon: FaThumbsUp, label: "Hiệu suất" },
    { id: "about", icon: FaUser, label: "Giới thiệu" },
  ];

  function renderModalContent() {
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
            <p>Freelancer chưa đăng thêm dịch vụ nào.</p>
          </div>
        );
      }
      return (
        <ul className="hire-modal-services">
          {(detail?.services ?? []).map((svc) => {
            const priceLabel = formatStartingPrice(svc.price);
            const thumbSrc = resolveFreelancerMedia(svc.thumbnail_url);
            const desc = svc.description?.trim();
            return (
              <li key={svc.id}>
                <article className="hire-modal-svc-card">
                  <div className="hire-modal-svc-card__media">
                    {thumbSrc ? (
                      <Image
                        src={thumbSrc}
                        alt=""
                        width={320}
                        height={180}
                        className="hire-modal-svc-card__img"
                        unoptimized
                      />
                    ) : (
                      <div className="hire-modal-svc-card__placeholder" aria-hidden>
                        <FaLaptopCode />
                      </div>
                    )}
                    {svc.category ? (
                      <span className="hire-modal-svc-card__badge">{svc.category}</span>
                    ) : null}
                  </div>
                  <div className="hire-modal-svc-card__body">
                    <h4 className="hire-modal-svc-card__title">{svc.title}</h4>
                    {desc ? (
                      <p className="hire-modal-svc-card__desc">{desc}</p>
                    ) : null}
                    <div className="hire-modal-svc-card__meta">
                      {priceLabel ? (
                        <span className="hire-modal-svc-card__price">{priceLabel}</span>
                      ) : null}
                      {svc.delivery_days != null ? (
                        <span className="hire-modal-svc-card__days">
                          <FaClock aria-hidden />
                          {svc.delivery_days} ngày giao hàng
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={profileHref(svc.id)}
                      className="hire-modal-svc-card__cta"
                    >
                      {guestMode ? "Xem chi tiết dịch vụ" : "Xem & yêu cầu báo giá"}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </article>
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
            <p>Chưa có mục portfolio.</p>
          </div>
        );
      }
      return (
        <ul className="hire-modal-services">
          {(detail?.portfolio ?? []).map((item) => {
            const images = parsePortfolioImageUrls(item.images);
            const preview = images[0];
            const desc =
              item.description?.trim() ||
              "Dự án thực tế do freelancer thực hiện trên nền tảng.";
            return (
              <li key={item.id}>
                <article className="hire-modal-svc-card">
                  <div className="hire-modal-svc-card__media">
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        width={480}
                        height={280}
                        className="hire-modal-svc-card__img"
                        unoptimized
                      />
                    ) : (
                      <div className="hire-modal-svc-card__placeholder" aria-hidden>
                        <FaImage />
                      </div>
                    )}
                    <span className="hire-modal-svc-card__badge">Portfolio</span>
                    {images.length > 1 ? (
                      <span className="hire-modal-svc-card__badge hire-modal-svc-card__badge--secondary">
                        +{images.length - 1} ảnh
                      </span>
                    ) : null}
                  </div>
                  <div className="hire-modal-svc-card__body">
                    <h4 className="hire-modal-svc-card__title">{item.title}</h4>
                    <p className="hire-modal-svc-card__desc">{desc}</p>
                    <div className="hire-modal-svc-card__meta">
                      {images.length > 0 ? (
                        <span className="hire-modal-svc-card__days">
                          <FaImage aria-hidden />
                          {images.length} hình ảnh
                        </span>
                      ) : null}
                    </div>
                    {item.project_url ? (
                      <a
                        href={item.project_url}
                        className="hire-modal-svc-card__cta"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Xem dự án
                        <FaExternalLinkAlt aria-hidden />
                      </a>
                    ) : (
                      <Link href={profileHref()} className="hire-modal-svc-card__cta">
                        Xem hồ sơ đầy đủ
                        <span aria-hidden>→</span>
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      );
    }

    if (activeModal === "performance") {
      const ratingAvg = row.rating_avg > 0 ? Number(row.rating_avg) : 0;
      const hasStrongSatisfaction = satisfaction >= 90;
      const hasStrongRating = ratingAvg >= 4.5;
      const hasStrongJobs = row.completed_jobs >= 5;

      const perfCards: {
        key: string;
        icon: typeof FaThumbsUp;
        title: string;
        value: string;
        badge?: string;
      }[] = [
        {
          key: "satisfaction",
          icon: FaThumbsUp,
          title: "Tỷ lệ hài lòng",
          value: satisfaction > 0 ? `${satisfaction}%` : "—",
          badge: hasStrongSatisfaction ? "Được tin cậy" : undefined,
        },
        {
          key: "rating",
          icon: FaStar,
          title: "Đánh giá trung bình",
          value: ratingAvg > 0 ? ratingAvg.toFixed(1) : "—",
          badge: hasStrongRating ? "Xuất sắc" : undefined,
        },
        {
          key: "jobs",
          icon: FaBriefcase,
          title: "Hợp đồng hoàn thành",
          value: String(row.completed_jobs),
          badge: hasStrongJobs ? "Kinh nghiệm tốt" : undefined,
        },
      ];

      if (row.job_success_score != null) {
        perfCards.push({
          key: "success",
          icon: FaCheckCircle,
          title: "Job Success",
          value: `${row.job_success_score}%`,
        });
      }

      const reviews = detail?.reviews ?? [];

      return (
        <div className="hire-modal-stack">
          <div className="hire-modal-trust">
            <FaCheckCircle aria-hidden />
            Thống kê từ hợp đồng và đánh giá thực tế trên nền tảng
          </div>

          <ul className="hire-modal-services">
            {perfCards.map((card) => (
              <li key={card.key}>
                <article className="hire-modal-svc-card">
                  <div className="hire-modal-svc-card__media hire-modal-svc-card__media--icon">
                    <card.icon aria-hidden />
                  </div>
                  <div className="hire-modal-svc-card__body">
                    <h4 className="hire-modal-svc-card__title">{card.title}</h4>
                    <div className="hire-modal-svc-card__meta">
                      <span className="hire-modal-svc-card__price">{card.value}</span>
                      {card.key === "rating" && ratingAvg > 0 ? (
                        <span className="hire-modal-svc-card__days">
                          {row.total_reviews > 0
                            ? `${row.total_reviews} đánh giá`
                            : "Chưa có nhận xét"}
                        </span>
                      ) : null}
                    </div>
                    {card.badge ? (
                      <span className="hire-modal-svc-card__tag">{card.badge}</span>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>

          {reviews.length > 0 ? (
            <>
              <p className="hire-modal-section-title">Đánh giá gần đây</p>
              <ul className="hire-modal-services">
                {reviews.slice(0, 5).map((review) => (
                  <li key={review.id}>
                    <article className="hire-modal-svc-card">
                      <div className="hire-modal-svc-card__media hire-modal-svc-card__media--icon">
                        <FaStar aria-hidden />
                        <span className="hire-modal-svc-card__badge">{review.rating}/5</span>
                      </div>
                      <div className="hire-modal-svc-card__body">
                        <h4 className="hire-modal-svc-card__title">
                          {review.client_name || "Client"}
                        </h4>
                        <p className="hire-modal-svc-card__desc">
                          {review.comment?.trim() || "Không có nhận xét chi tiết."}
                        </p>
                        <div className="hire-modal-svc-card__meta">
                          <span className="hire-modal-svc-card__days">
                            <FaClock aria-hidden />
                            {formatDate(review.created_at)}
                          </span>
                          <span className="hire-modal-svc-card__stars" aria-hidden>
                            {Array.from({ length: 5 }, (_, i) => (
                              <FaStar
                                key={i}
                                className={
                                  i < review.rating
                                    ? "hire-modal-svc-card__star hire-modal-svc-card__star--on"
                                    : "hire-modal-svc-card__star"
                                }
                              />
                            ))}
                          </span>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="hire-modal-empty hire-modal-empty--compact">
              <FaStar className="hire-modal-empty__icon" aria-hidden />
              <p>Chưa có đánh giá từ client.</p>
            </div>
          )}
        </div>
      );
    }

    if (activeModal === "about") {
      const bio =
        detail?.freelancer.bio?.trim() || row.bio?.trim() || "Freelancer chưa cập nhật phần giới thiệu.";
      const ratingAvg = row.rating_avg > 0 ? Number(row.rating_avg) : 0;

      const aboutStats: { label: string; value: string }[] = [];
      if (row.experience_years != null) {
        aboutStats.push({ label: "Kinh nghiệm", value: `${row.experience_years}+ năm` });
      }
      if (row.avg_response_minutes) {
        aboutStats.push({ label: "Phản hồi TB", value: `~${row.avg_response_minutes} phút` });
      }
      if (row.services_count > 0) {
        aboutStats.push({ label: "Dịch vụ", value: String(row.services_count) });
      }
      if (row.portfolio_count > 0) {
        aboutStats.push({ label: "Portfolio", value: String(row.portfolio_count) });
      }

      return (
        <div className="hire-modal-stack">
          <ul className="hire-modal-services hire-modal-services--featured">
            <li>
              <article className="hire-modal-svc-card hire-modal-svc-card--featured">
                <div className="hire-modal-svc-card__media hire-modal-svc-card__media--avatar">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt=""
                      width={320}
                      height={180}
                      className="hire-modal-svc-card__img hire-modal-svc-card__img--avatar"
                      unoptimized
                    />
                  ) : (
                    <div className="hire-modal-svc-card__placeholder hire-modal-svc-card__placeholder--avatar">
                      {getUserInitials(row.full_name)}
                    </div>
                  )}
                  {badges[0] ? (
                    <span className="hire-modal-svc-card__badge">{badges[0].toUpperCase()}</span>
                  ) : (
                    <span className="hire-modal-svc-card__badge">Freelancer</span>
                  )}
                </div>
                <div className="hire-modal-svc-card__body">
                  <h4 className="hire-modal-svc-card__title">{row.full_name}</h4>
                  {row.title?.trim() ? (
                    <p className="hire-modal-svc-card__subtitle">{row.title.trim()}</p>
                  ) : null}
                  {locationDisplay(row) !== "—" ? (
                    <p className="hire-modal-svc-card__desc">
                      <FaMapMarkerAlt aria-hidden />
                      {locationDisplay(row)}
                    </p>
                  ) : null}
                  <p className="hire-modal-svc-card__desc hire-modal-svc-card__desc--bio">{bio}</p>
                  <div className="hire-modal-svc-card__meta">
                    {satisfaction > 0 ? (
                      <span className="hire-modal-svc-card__price">{satisfaction}% hài lòng</span>
                    ) : null}
                    {row.completed_jobs > 0 ? (
                      <span className="hire-modal-svc-card__days">
                        <FaBriefcase aria-hidden />
                        {row.completed_jobs} hợp đồng
                      </span>
                    ) : null}
                    {ratingAvg > 0 ? (
                      <span className="hire-modal-svc-card__days">
                        <FaStar aria-hidden />
                        {ratingAvg.toFixed(1)} điểm
                      </span>
                    ) : null}
                  </div>
                  {row.skills.length > 0 ? (
                    <div className="hire-modal-svc-card__tags">
                      {row.skills.map((skill) => (
                        <span key={skill} className="hire-modal-svc-card__tag">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="hire-modal-svc-card__actions">
                    <Link href={profileHref()} className="hire-modal-svc-card__cta">
                      Xem hồ sơ đầy đủ
                      <span aria-hidden>→</span>
                    </Link>
                    <Link
                      href={quoteHref(row.featured_service_id)}
                      className="hire-modal-svc-card__cta hire-modal-svc-card__cta--outline"
                    >
                      {guestMode ? "Đăng nhập để thuê" : "Yêu cầu báo giá"}
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          </ul>

          {aboutStats.length > 0 ? (
            <ul className="hire-modal-services">
              {aboutStats.map((stat) => (
                <li key={stat.label}>
                  <article className="hire-modal-svc-card">
                    <div className="hire-modal-svc-card__media hire-modal-svc-card__media--icon">
                      <FaUser aria-hidden />
                    </div>
                    <div className="hire-modal-svc-card__body">
                      <h4 className="hire-modal-svc-card__title">{stat.label}</h4>
                      <div className="hire-modal-svc-card__meta">
                        <span className="hire-modal-svc-card__price">{stat.value}</span>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          ) : null}
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
                  <Link href={profileHref(row.featured_service_id)}>
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
              {guestMode ? (
                <Link
                  href={favoriteHref()}
                  className="hire-search__heart"
                  aria-label="Đăng nhập để lưu yêu thích"
                >
                  <FaHeart aria-hidden />
                </Link>
              ) : (
                <button
                  type="button"
                  className={`hire-search__heart${isFavorite ? " hire-search__heart--active" : ""}`}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào My Favorites"}
                  onClick={() => onToggleFavorite(row.id)}
                >
                  <FaHeart aria-hidden />
                </button>
              )}
              <Link
                href={quoteHref(row.featured_service_id)}
                className="hire-search__quote-btn"
              >
                {guestMode ? "Đăng nhập để thuê" : "Get a Quote"}
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
        <div
          className="hire-search__detail-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className={`hire-search__detail-modal hire-search__detail-modal--${MODAL_META[activeModal].accent}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${MODAL_META[activeModal].title} — ${row.full_name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header
              className={`hire-modal-header hire-modal-header--${MODAL_META[activeModal].accent}`}
            >
              <div className="hire-modal-header__top">
                <div className="hire-modal-header__identity">
                  <div className="hire-modal-header__avatar">
                    {avatarSrc ? (
                      <Image
                        src={avatarSrc}
                        alt=""
                        width={40}
                        height={40}
                        className="hire-modal-header__avatar-img"
                        unoptimized
                      />
                    ) : (
                      <span className="hire-modal-header__avatar-fallback">
                        {getUserInitials(row.full_name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="hire-modal-header__eyebrow">{MODAL_META[activeModal].title}</p>
                    <h3 className="hire-modal-header__headline">
                      {MODAL_META[activeModal].headline}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  className="hire-modal-header__close"
                  aria-label={MODAL_META[activeModal].closeLabel}
                  onClick={closeModal}
                >
                  ×
                </button>
              </div>
              <p className="hire-modal-header__subtitle">
                {MODAL_META[activeModal].subtitle(row)}
              </p>
            </header>
            <div className="hire-search__detail-modal-body">{renderModalContent()}</div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
