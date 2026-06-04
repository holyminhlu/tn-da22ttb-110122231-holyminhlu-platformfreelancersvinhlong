"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBriefcase,
  FaClock,
  FaExternalLinkAlt,
  FaHeart,
  FaImage,
  FaLaptopCode,
  FaMapMarkerAlt,
  FaStar,
  FaThumbsUp,
} from "react-icons/fa";
import { getFreelancer, type FreelancerProfilePayload } from "@/lib/api/freelancers";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import {
  toggleFavoriteFreelancerId,
  readFavoriteFreelancerIds,
} from "@/lib/hire/favoriteFreelancersStorage";
import {
  displayMembershipBadges,
  formatHourlyRate,
  formatStartingPrice,
  formatYearlyEarnings,
  locationDisplay,
  parseLanguages,
  parsePortfolioImageUrls,
  parseProfileBadges,
  resolveFreelancerMedia,
  satisfactionPercent,
} from "@/lib/hire/freelancerSearchDisplay";
import { formatDate } from "@/lib/format";
import HireShell from "./HireShell";
import "./hire.css";
import "./hire-freelancer-detail.css";

function formatPriceVndStyle(amount: string | number | null | undefined): string | null {
  return formatStartingPrice(amount);
}

export default function ClientHireFreelancerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const freelancerId = String(params?.freelancerId ?? "");
  const serviceQuery = searchParams.get("service");

  const [data, setData] = useState<FreelancerProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const load = useCallback(async () => {
    if (!freelancerId) {
      setError("Mã freelancer không hợp lệ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await getFreelancer(
        freelancerId,
        serviceQuery || undefined,
      );
      setData(payload);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải hồ sơ freelancer.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [freelancerId, serviceQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (freelancerId) {
      setIsFavorite(readFavoriteFreelancerIds().includes(freelancerId));
    }
  }, [freelancerId]);

  const fl = data?.freelancer;
  const satisfaction = fl ? satisfactionPercent(fl) : 0;
  const badges = useMemo(
    () => displayMembershipBadges(parseProfileBadges(fl?.profile_badges)),
    [fl?.profile_badges],
  );
  const languages = useMemo(() => parseLanguages(fl?.languages), [fl?.languages]);
  const avatarSrc = resolveAvatarSrc(fl?.avatar_url);
  const hourly = formatHourlyRate(fl?.hourly_rate);
  const highlightServiceId = serviceQuery || data?.featuredService?.id;
  const primaryServiceId =
    highlightServiceId || data?.services?.[0]?.id || data?.featuredService?.id;
  const quoteHref = primaryServiceId
    ? `/hire/quote?serviceId=${encodeURIComponent(primaryServiceId)}&freelancerId=${encodeURIComponent(freelancerId)}`
    : `/hire/search/${freelancerId}`;

  function handleToggleFavorite() {
    if (!freelancerId) return;
    const next = toggleFavoriteFreelancerId(freelancerId);
    setIsFavorite(next);
  }

  if (loading) {
    return (
      <HireShell>
        <div className="hire-page hire-fl-detail hire-fl-detail--full-width">
          <p className="hire-page__state">Đang tải hồ sơ freelancer...</p>
        </div>
      </HireShell>
    );
  }

  if (error || !fl) {
    return (
      <HireShell>
        <div className="hire-page hire-fl-detail hire-fl-detail--full-width">
          <Link href="/hire/search" className="hire-fl-detail__back">
            <FaArrowLeft aria-hidden /> Quay lại tìm kiếm
          </Link>
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error || "Không tìm thấy freelancer."}
          </p>
        </div>
      </HireShell>
    );
  }

  const ratingAvg = Number(fl.rating_avg);
  const featured = data.featuredService;
  const featuredThumb = resolveFreelancerMedia(featured?.thumbnail_url);

  return (
    <HireShell>
      <div className="hire-page hire-fl-detail hire-fl-detail--full-width">
        <Link href="/hire/search" className="hire-fl-detail__back">
          <FaArrowLeft aria-hidden /> Quay lại tìm kiếm freelancer
        </Link>

        <header className="hire-fl-detail__hero">
          <div className="hire-fl-detail__avatar">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt=""
                width={88}
                height={88}
                className="hire-fl-detail__avatar-img"
                unoptimized
              />
            ) : (
              getUserInitials(fl.full_name)
            )}
          </div>

          <div className="hire-fl-detail__identity">
            <h1 className="hire-fl-detail__name">{fl.full_name}</h1>
            {fl.tagline?.trim() ? (
              <p className="hire-fl-detail__tagline">{fl.tagline.trim()}</p>
            ) : null}
            <p className="hire-fl-detail__title-role">{fl.title?.trim() || "Freelancer"}</p>
            <div className="hire-fl-detail__badges">
              {badges.map((badge) => (
                <span key={badge} className="hire-fl-detail__badge">
                  {badge.toUpperCase()}
                </span>
              ))}
            </div>
            <div className="hire-fl-detail__meta-row">
              <span className="hire-fl-detail__meta-item">
                <FaMapMarkerAlt aria-hidden />
                {locationDisplay(fl)}
              </span>
              <span className="hire-fl-detail__meta-item">
                <FaBriefcase aria-hidden />
                {formatYearlyEarnings(fl.total_earnings)}
              </span>
              {ratingAvg > 0 ? (
                <span className="hire-fl-detail__meta-item hire-fl-detail__meta-item--rating">
                  <span className="hire-fl-detail__stars" aria-label={`${ratingAvg} trên 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <FaStar
                        key={i}
                        className={
                          i < Math.round(ratingAvg)
                            ? "hire-fl-detail__star hire-fl-detail__star--on"
                            : "hire-fl-detail__star"
                        }
                        aria-hidden
                      />
                    ))}
                  </span>
                  {ratingAvg.toFixed(1)} ({fl.total_reviews} đánh giá)
                </span>
              ) : (
                <span className="hire-fl-detail__meta-item">Chưa có đánh giá</span>
              )}
              {satisfaction > 0 ? (
                <span className="hire-fl-detail__meta-item">
                  <FaThumbsUp aria-hidden />
                  {satisfaction}% hài lòng
                </span>
              ) : null}
              {hourly ? (
                <span className="hire-fl-detail__meta-item">{hourly}</span>
              ) : null}
            </div>
          </div>

          <div className="hire-fl-detail__actions">
            <Link href={quoteHref} className="hire-fl-detail__btn hire-fl-detail__btn--primary">
              Yêu cầu báo giá
            </Link>
            <Link
              href="/hire/post"
              className="hire-fl-detail__btn hire-fl-detail__btn--outline"
            >
              Đăng tin thuê
            </Link>
            <button
              type="button"
              className={`hire-fl-detail__btn hire-fl-detail__btn--heart${isFavorite ? " hire-fl-detail__btn--heart-active" : ""}`}
              onClick={handleToggleFavorite}
              aria-pressed={isFavorite}
            >
              <FaHeart aria-hidden />
              {isFavorite ? "Đã lưu yêu thích" : "Lưu yêu thích"}
            </button>
          </div>
        </header>

        <div className="hire-fl-detail__stats" aria-label="Thống kê freelancer">
          <div className="hire-fl-detail__stat">
            <span className="hire-fl-detail__stat-value">{fl.completed_jobs}</span>
            <span className="hire-fl-detail__stat-label">Hợp đồng hoàn thành</span>
          </div>
          <div className="hire-fl-detail__stat">
            <span className="hire-fl-detail__stat-value">
              {fl.job_success_score != null ? `${fl.job_success_score}%` : "—"}
            </span>
            <span className="hire-fl-detail__stat-label">Job Success</span>
          </div>
          <div className="hire-fl-detail__stat">
            <span className="hire-fl-detail__stat-value">
              {fl.experience_years != null ? fl.experience_years : "—"}
            </span>
            <span className="hire-fl-detail__stat-label">Năm kinh nghiệm</span>
          </div>
          <div className="hire-fl-detail__stat">
            <span className="hire-fl-detail__stat-value">
              {fl.avg_response_minutes ? `~${fl.avg_response_minutes}p` : "—"}
            </span>
            <span className="hire-fl-detail__stat-label">Phản hồi TB</span>
          </div>
          <div className="hire-fl-detail__stat">
            <span className="hire-fl-detail__stat-value">{data.services.length}</span>
            <span className="hire-fl-detail__stat-label">Dịch vụ</span>
          </div>
          <div className="hire-fl-detail__stat">
            <span className="hire-fl-detail__stat-value">{data.portfolio.length}</span>
            <span className="hire-fl-detail__stat-label">Portfolio</span>
          </div>
        </div>

        <div className="hire-fl-detail__layout">
          <div className="hire-fl-detail__main">
            <section className="hire-fl-detail__section" aria-labelledby="fl-about-heading">
              <h2 id="fl-about-heading" className="hire-fl-detail__section-title">
                Giới thiệu
              </h2>
              <p className="hire-fl-detail__bio">
                {fl.bio?.trim() || "Freelancer chưa cập nhật phần giới thiệu."}
              </p>
              {fl.skills?.length > 0 ? (
                <div className="hire-fl-detail__chips" aria-label="Kỹ năng">
                  {fl.skills.map((skill) => (
                    <span key={skill} className="hire-fl-detail__chip">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
              {languages.length > 0 ? (
                <div className="hire-fl-detail__chips" aria-label="Ngôn ngữ">
                  {languages.map((lang) => (
                    <span key={lang} className="hire-fl-detail__chip hire-fl-detail__chip--muted">
                      {lang}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            {featured ? (
              <section className="hire-fl-detail__section" aria-labelledby="fl-featured-heading">
                <h2 id="fl-featured-heading" className="hire-fl-detail__section-title">
                  Dịch vụ nổi bật
                </h2>
                <div className="hire-fl-detail__featured">
                  <div className="hire-fl-detail__featured-media">
                    {featuredThumb ? (
                      <Image
                        src={featuredThumb}
                        alt=""
                        width={320}
                        height={200}
                        className="hire-fl-detail__featured-img"
                        unoptimized
                      />
                    ) : (
                      <FaLaptopCode aria-hidden />
                    )}
                  </div>
                  <div>
                    <h3 className="hire-fl-detail__featured-title">{featured.title}</h3>
                    {featured.description?.trim() ? (
                      <p className="hire-fl-detail__featured-desc">{featured.description.trim()}</p>
                    ) : null}
                    <div className="hire-fl-detail__featured-meta">
                      {featured.category ? <span>{featured.category}</span> : null}
                      {formatPriceVndStyle(featured.price) ? (
                        <span className="hire-fl-detail__featured-price">
                          {formatPriceVndStyle(featured.price)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="hire-fl-detail__section" aria-labelledby="fl-services-heading">
              <h2 id="fl-services-heading" className="hire-fl-detail__section-title">
                Tất cả dịch vụ ({data.services.length})
              </h2>
              {data.services.length === 0 ? (
                <p className="hire-fl-detail__empty">Chưa có dịch vụ nào được đăng.</p>
              ) : (
                <ul className="hire-fl-detail__services-grid">
                  {data.services.map((svc) => {
                    const thumb = resolveFreelancerMedia(svc.thumbnail_url);
                    const isHighlight = highlightServiceId === svc.id;
                    return (
                      <li
                        key={svc.id}
                        className={`hire-fl-detail__service-card${isHighlight ? " hire-fl-detail__service-card--highlight" : ""}`}
                      >
                        <div className="hire-fl-detail__service-thumb">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt=""
                              width={280}
                              height={158}
                              className="hire-fl-detail__service-thumb-img"
                              unoptimized
                            />
                          ) : (
                            <FaLaptopCode aria-hidden />
                          )}
                        </div>
                        <div className="hire-fl-detail__service-body">
                          <h3 className="hire-fl-detail__service-title">{svc.title}</h3>
                          {svc.category ? (
                            <p className="hire-fl-detail__service-cat">{svc.category}</p>
                          ) : null}
                          {svc.description?.trim() ? (
                            <p className="hire-fl-detail__service-desc">{svc.description.trim()}</p>
                          ) : null}
                          <div className="hire-fl-detail__service-foot">
                            {formatPriceVndStyle(svc.price) ? (
                              <span className="hire-fl-detail__service-price">
                                {formatPriceVndStyle(svc.price)}
                              </span>
                            ) : null}
                            {svc.delivery_days != null ? (
                              <span>
                                <FaClock aria-hidden /> {svc.delivery_days} ngày
                              </span>
                            ) : null}
                          </div>
                          <Link
                            href={`/hire/quote?serviceId=${encodeURIComponent(svc.id)}&freelancerId=${encodeURIComponent(freelancerId)}`}
                            className="hire-fl-detail__btn hire-fl-detail__btn--primary"
                            style={{ marginTop: "0.65rem", display: "inline-flex" }}
                          >
                            Yêu cầu báo giá
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="hire-fl-detail__section" aria-labelledby="fl-portfolio-heading">
              <h2 id="fl-portfolio-heading" className="hire-fl-detail__section-title">
                Portfolio ({data.portfolio.length})
              </h2>
              {data.portfolio.length === 0 ? (
                <p className="hire-fl-detail__empty">Chưa có mục portfolio.</p>
              ) : (
                <ul className="hire-fl-detail__portfolio-grid">
                  {data.portfolio.map((item) => {
                    const images = parsePortfolioImageUrls(item.images);
                    const preview = images[0];
                    return (
                      <li key={item.id} className="hire-fl-detail__portfolio-card">
                        <div className="hire-fl-detail__portfolio-preview">
                          {preview ? (
                            <Image src={preview} alt="" width={240} height={150} unoptimized />
                          ) : (
                            <FaImage aria-hidden />
                          )}
                        </div>
                        <div className="hire-fl-detail__portfolio-body">
                          <h3 className="hire-fl-detail__portfolio-title">{item.title}</h3>
                          {item.description?.trim() ? (
                            <p className="hire-fl-detail__portfolio-desc">{item.description.trim()}</p>
                          ) : null}
                          {item.project_url ? (
                            <a
                              href={item.project_url}
                              className="hire-fl-detail__portfolio-link"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Xem dự án <FaExternalLinkAlt aria-hidden />
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="hire-fl-detail__section" aria-labelledby="fl-reviews-heading">
              <h2 id="fl-reviews-heading" className="hire-fl-detail__section-title">
                Đánh giá từ Client ({data.reviews.length})
              </h2>
              {data.reviews.length === 0 ? (
                <p className="hire-fl-detail__empty">
                  Chưa có đánh giá — bạn có thể là người đầu tiên thuê và đánh giá sau khi hoàn
                  thành hợp đồng.
                </p>
              ) : (
                <ul className="hire-fl-detail__reviews-list">
                  {data.reviews.map((review) => (
                    <li key={review.id} className="hire-fl-detail__review">
                      <div className="hire-fl-detail__review-head">
                        <span className="hire-fl-detail__stars" aria-label={`${review.rating} sao`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <FaStar
                              key={i}
                              className={
                                i < review.rating
                                  ? "hire-fl-detail__star hire-fl-detail__star--on"
                                  : "hire-fl-detail__star"
                              }
                              aria-hidden
                            />
                          ))}
                        </span>
                        <span className="hire-fl-detail__review-author">
                          {review.client_name || "Client"}
                        </span>
                        <time className="hire-fl-detail__review-date" dateTime={review.created_at}>
                          {formatDate(review.created_at)}
                        </time>
                      </div>
                      {review.comment?.trim() ? (
                        <p className="hire-fl-detail__review-comment">{review.comment.trim()}</p>
                      ) : (
                        <p className="hire-fl-detail__review-comment hire-fl-detail__empty">
                          Không có nhận xét chi tiết.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="hire-fl-detail__sidebar" aria-label="Tóm tắt thuê">
            <div className="hire-fl-detail__sidebar-card">
              <h2 className="hire-fl-detail__sidebar-title">Tóm tắt trước khi thuê</h2>
              <ul className="hire-fl-detail__sidebar-list">
                <li>
                  <span>Đánh giá</span>
                  <strong>
                    {ratingAvg > 0 ? `${ratingAvg.toFixed(1)} / 5` : "Chưa có"}
                  </strong>
                </li>
                <li>
                  <span>Hài lòng</span>
                  <strong>{satisfaction > 0 ? `${satisfaction}%` : "—"}</strong>
                </li>
                <li>
                  <span>Hoàn thành</span>
                  <strong>{fl.completed_jobs} việc</strong>
                </li>
                <li>
                  <span>Kinh nghiệm</span>
                  <strong>
                    {fl.experience_years != null ? `${fl.experience_years} năm` : "—"}
                  </strong>
                </li>
                <li>
                  <span>Phản hồi</span>
                  <strong>
                    {fl.avg_response_minutes ? `~${fl.avg_response_minutes} phút` : "—"}
                  </strong>
                </li>
              </ul>
              <div className="hire-fl-detail__sidebar-actions">
                <Link href={quoteHref} className="hire-fl-detail__btn hire-fl-detail__btn--primary">
                  Yêu cầu báo giá
                </Link>
                <Link
                  href="/hire/favorites"
                  className="hire-fl-detail__btn hire-fl-detail__btn--outline"
                >
                  Xem mục yêu thích
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </HireShell>
  );
}
