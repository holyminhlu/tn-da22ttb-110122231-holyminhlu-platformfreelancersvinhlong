"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  FaCheckCircle,
  FaFolderOpen,
  FaPlusCircle,
  FaQuoteLeft,
  FaStar,
  FaTools,
  FaUserEdit,
  FaWallet,
} from "react-icons/fa";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import FreelancerShell from "@/components/layout/FreelancerShell";
import { assignmentToListItem, type JobsListItem } from "@/components/jobs/jobs-filter";
import { isFreelancerRole } from "@/hooks/useStoredUser";
import { usePagedList } from "@/hooks/usePagedList";
import { getMyWork } from "@/lib/api/contracts";
import {
  freelancerTransactionCategoryLabel,
  getFreelancerBillingOverview,
  type FreelancerBillingOverview,
  type FreelancerTransaction,
} from "@/lib/api/payments";
import {
  getMe,
  isFreelancerMeResponse,
  type ContractReview,
  type FreelancerMeResponse,
  type FreelancerProfile,
  type FreelancerService,
  type MeUser,
} from "@/lib/api/users";
import {
  getUserInitials,
  persistStoredUser,
  resolveAvatarSrc,
  toStoredUser,
  VLC_USER_UPDATED_EVENT,
} from "@/lib/authSession";
import { formatDate, formatVnd } from "@/lib/format";
import {
  isActiveJobContract,
  isJobOnlyContract,
  jobContractHref,
  jobContractStageLabel,
} from "@/lib/findwork/jobContractsDisplay";
import DashboardPagination from "./DashboardPagination";
import "./dashboard.css";
import "./dashboardPagination.css";

const WIDGET_PAGE_SIZE = 5;

function apiErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return fallback;
}

function isUnauthorized(err: unknown) {
  return Boolean(
    err && typeof err === "object" && "status" in err && (err as { status: number }).status === 401,
  );
}

function DashboardWidget({
  title,
  headLinks,
  children,
  alignLeft = false,
}: {
  title: string;
  headLinks?: ReactNode;
  children: ReactNode;
  alignLeft?: boolean;
}) {
  return (
    <section className="client-widget">
      <header className="client-widget__head">
        <span>{title}</span>
        {headLinks ? <div className="client-widget__head-links">{headLinks}</div> : null}
      </header>
      <div className={`client-widget__body${alignLeft ? " client-widget__body--left" : ""}`}>
        {children}
      </div>
    </section>
  );
}

function WidgetWorkList({ items }: { items: JobsListItem[] }) {
  const { items: pageItems, page, totalPages, total, setPage } = usePagedList(items, WIDGET_PAGE_SIZE);

  return (
    <>
      <ul className="client-widget__list">
        {pageItems.map((item) => (
          <li key={item.id} className="client-widget__list-item">
            <Link href={jobContractHref(item, "freelancer")} className="client-widget__list-title">
              {item.title}
            </Link>
            <p className="client-widget__list-meta">
              {item.counterparty ? `${item.counterparty} · ` : ""}
              {jobContractStageLabel(item)}
              {item.agreedPrice != null ? ` · ${formatVnd(item.agreedPrice)}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <DashboardPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </>
  );
}

function WidgetServiceList({ services }: { services: FreelancerService[] }) {
  const { items, page, totalPages, total, setPage } = usePagedList(services, WIDGET_PAGE_SIZE);

  return (
    <>
      <ul className="client-widget__list">
        {items.map((service) => (
          <li key={service.id} className="client-widget__list-item">
            <Link href={`/dich-vu/quan-ly/${service.id}`} className="client-widget__list-title">
              {service.title}
            </Link>
            <p className="client-widget__list-meta">
              {formatVnd(service.price)}
              {service.delivery_days != null ? ` · Giao ${service.delivery_days} ngày` : ""}
            </p>
          </li>
        ))}
      </ul>
      <DashboardPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </>
  );
}

function WidgetPaymentsList({ transactions }: { transactions: FreelancerTransaction[] }) {
  const { items, page, totalPages, total, setPage } = usePagedList(transactions, WIDGET_PAGE_SIZE);

  return (
    <>
      <ul className="client-widget__list">
        {items.map((tx) => (
          <li key={tx.id} className="client-widget__list-item">
            <span className="client-widget__list-title">{tx.projectTitle || "Giao dịch"}</span>
            <p className="client-widget__list-meta">
              {formatVnd(tx.amount)}
              {tx.clientName ? ` · ${tx.clientName}` : ""}
              {" · "}
              {freelancerTransactionCategoryLabel(tx.category)}
              {" · "}
              {formatDate(tx.occurredAt)}
            </p>
          </li>
        ))}
      </ul>
      <DashboardPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </>
  );
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "md" | "sm" }) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span
      className={`fd-stars fd-stars--${size}`}
      aria-label={`${rating.toFixed(1)} trên 5 sao`}
      role="img"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <FaStar
          key={index}
          className={index < filled ? "fd-stars__icon fd-stars__icon--on" : "fd-stars__icon"}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ReviewsHighlightPanel({
  profile,
  reviews,
}: {
  profile: FreelancerProfile | null;
  reviews: ContractReview[];
}) {
  const avg = profile ? Number(profile.rating_avg) : 0;
  const totalReviews = profile?.total_reviews ?? reviews.length;
  const successScore = profile?.job_success_score;
  const featured = reviews[0];
  const recent = reviews.slice(0, 3);

  return (
    <DashboardWidget
      title="Đánh giá"
      alignLeft
      headLinks={<Link href="/ho-so/phan-hoi">Tất cả phản hồi</Link>}
    >
      <div className="fd-widget-block">
        <div className="fd-reviews-hero">
          <div className="fd-reviews-score">
            <p className="fd-reviews-score__value">{avg > 0 ? avg.toFixed(1) : "—"}</p>
            <StarRating rating={avg > 0 ? avg : 0} />
            <p className="fd-reviews-score__caption">
              {totalReviews > 0 ? `${totalReviews} lượt đánh giá` : "Chưa có đánh giá"}
            </p>
          </div>
          {successScore != null ? (
            <div className="fd-reviews-metric">
              <p className="fd-reviews-metric__value">{successScore}%</p>
              <p className="fd-reviews-metric__label">Tỷ lệ thành công</p>
            </div>
          ) : null}
        </div>

        {featured ? (
          <blockquote className="fd-review-featured">
            <FaQuoteLeft className="fd-review-featured__icon" aria-hidden />
            <p className="fd-review-featured__text">
              {featured.comment?.trim() || "Khách hàng đã để lại điểm đánh giá."}
            </p>
            <footer className="fd-review-featured__foot">
              <StarRating rating={featured.rating} size="sm" />
              <span>
                {featured.reviewer_name || "Khách hàng"} · {formatDate(featured.created_at)}
              </span>
            </footer>
          </blockquote>
        ) : (
          <div className="fd-review-empty">
            <h3 className="client-widget__title">Chưa có phản hồi nào</h3>
            <p className="client-widget__muted">
              Hoàn thành đơn hàng và nhận đánh giá từ client để xây dựng uy tín trên nền tảng.
            </p>
            <Link href="/findwork" className="client-widget__link">
              Tìm việc ngay
            </Link>
          </div>
        )}

        {recent.length > 1 ? (
          <ul className="client-widget__list fd-review-mini-list">
            {recent.slice(featured ? 1 : 0).map((review) => (
              <li key={review.id} className="client-widget__list-item">
                <p className="client-widget__list-title">
                  {review.reviewer_name || "Khách hàng"}
                </p>
                <p className="client-widget__list-meta">
                  <StarRating rating={review.rating} size="sm" />
                  {review.comment ? ` · ${review.comment}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DashboardWidget>
  );
}

function ProfileQuickPanel({
  user,
  profile,
  completionScore,
  skillsCount,
  portfolioCount,
}: {
  user: MeUser;
  profile: FreelancerProfile | null;
  completionScore: number;
  skillsCount: number;
  portfolioCount: number;
}) {
  const emailOk = Boolean(user.isEmailVerified);
  const phoneOk = Boolean(user.isPhoneVerified);
  const availability = String(profile?.availability_status || "").toLowerCase();

  const availabilityLabel =
    availability === "available"
      ? "Sẵn sàng nhận việc"
      : availability === "busy"
        ? "Đang bận"
        : availability === "unavailable"
          ? "Không nhận việc"
          : "Chưa cập nhật";

  const availabilityClass =
    availability === "available"
      ? "fd-pill--success"
      : availability === "busy"
        ? "fd-pill--warn"
        : availability === "unavailable"
          ? "fd-pill--muted"
          : "fd-pill--muted";

  return (
    <DashboardWidget
      title="Hồ sơ nhanh"
      alignLeft
      headLinks={<Link href="/ho-so">Chỉnh sửa hồ sơ</Link>}
    >
      <div className="fd-widget-block">
        <div className="fd-profile-top">
          <div
            className="fd-profile-ring"
            style={
              { "--fd-progress": `${Math.min(100, Math.max(0, completionScore))}` } as CSSProperties
            }
          >
            <div className="fd-profile-ring__inner">
              <strong>{completionScore}%</strong>
              <span>Hoàn thiện</span>
            </div>
          </div>
          <div className="fd-profile-top__meta">
            <span className={`fd-pill ${availabilityClass}`}>{availabilityLabel}</span>
            <p className="fd-profile-top__hint">
              {completionScore >= 100
                ? "Hồ sơ của bạn đã đầy đủ — tiếp tục cập nhật để nổi bật hơn."
                : `Còn ${100 - completionScore}% để hoàn thiện hồ sơ công khai.`}
            </p>
          </div>
        </div>

        <div className="fd-profile-stats">
          <Link href="/ho-so?add=skills" className="fd-stat-card fd-stat-card--skills">
            <span className="fd-stat-card__icon" aria-hidden>
              <FaTools />
            </span>
            <strong className="fd-stat-card__value">{skillsCount}</strong>
            <span className="fd-stat-card__label">Kỹ năng</span>
          </Link>
          <Link href="/ho-so?add=portfolio" className="fd-stat-card fd-stat-card--portfolio">
            <span className="fd-stat-card__icon" aria-hidden>
              <FaFolderOpen />
            </span>
            <strong className="fd-stat-card__value">{portfolioCount}</strong>
            <span className="fd-stat-card__label">Dự án</span>
          </Link>
        </div>

        <div className="fd-verify-row">
          <span className={`fd-verify-badge${emailOk ? " fd-verify-badge--ok" : ""}`}>
            {emailOk ? <FaCheckCircle aria-hidden /> : null}
            E-mail {emailOk ? "đã xác thực" : "chưa xác thực"}
          </span>
          <span className={`fd-verify-badge${phoneOk ? " fd-verify-badge--ok" : ""}`}>
            {phoneOk ? <FaCheckCircle aria-hidden /> : null}
            Số điện thoại {phoneOk ? "đã xác thực" : "chưa xác thực"}
          </span>
        </div>

        {completionScore < 100 ? (
          <Link href="/ho-so" className="client-widget__link fd-widget-action">
            <FaUserEdit className="mr-1 inline" aria-hidden />
            Hoàn thiện hồ sơ ngay
          </Link>
        ) : (
          <Link href="/ho-so/thong-ke" className="client-widget__link fd-widget-action">
            Xem thống kê hồ sơ
          </Link>
        )}
      </div>
    </DashboardWidget>
  );
}

export default function FreelancerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<FreelancerMeResponse | null>(null);
  const [billing, setBilling] = useState<FreelancerBillingOverview | null>(null);
  const [workItems, setWorkItems] = useState<JobsListItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [me, work, billingData] = await Promise.all([
        getMe(),
        getMyWork(),
        getFreelancerBillingOverview().catch(() => null),
      ]);

      if (!isFreelancerMeResponse(me) || !isFreelancerRole(me.user?.role)) {
        setError("Tài khoản này không phải tài khoản chuyên gia.");
        setData(null);
        setWorkItems([]);
        setBilling(null);
        return;
      }

      setData(me);
      setBilling(billingData);

      if (me.user) {
        persistStoredUser(
          toStoredUser({
            id: me.user.id,
            email: me.user.email,
            role: me.user.role,
            fullName: me.user.fullName,
            avatarUrl: me.user.avatarUrl,
            completedJobs: me.user.completedJobs,
          }),
        );
      }

      if (work.role === "freelancer") {
        const rows = (work.assignments ?? []).map(assignmentToListItem).filter(isJobOnlyContract);
        setWorkItems(rows.filter(isActiveJobContract));
      } else {
        setWorkItems([]);
      }
    } catch (err) {
      if (isUnauthorized(err)) {
        router.replace("/dang-nhap");
        return;
      }
      setError(apiErrorMessage(err, "Không thể tải bảng tổng quan."));
      setData(null);
      setWorkItems([]);
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onUpdate = () => void load();
    window.addEventListener(VLC_USER_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(VLC_USER_UPDATED_EVENT, onUpdate);
  }, [load]);

  const user = data?.user;
  const profile = data?.freelancerProfile;
  const services = data?.services ?? [];
  const reviews = data?.reviews ?? [];
  const displayName = user?.fullName?.trim() || user?.email || "—";
  const avatarSrc = resolveAvatarSrc(user?.avatarUrl);
  const completedJobs = user?.completedJobs ?? profile?.completed_jobs ?? 0;
  const reviewCount = reviews.length;
  const balance = billing?.account.balance ?? 0;
  const pendingBalance = billing?.account.pendingBalance ?? 0;
  const recentTransactions = billing?.transactions ?? [];

  const profileSummary = useMemo(() => {
    const parts: string[] = [];
    if (data?.completionScore != null) parts.push(`Hồ sơ ${data.completionScore}%`);
    if (completedJobs > 0) parts.push(`${completedJobs} đơn hoàn thành`);
    const avg = profile ? Number(profile.rating_avg) : 0;
    if (avg > 0) parts.push(`★ ${avg.toFixed(1)}`);
    return parts.join(" · ") || null;
  }, [completedJobs, data?.completionScore, profile]);

  return (
    <FreelancerShell wide>
      {loading ? (
        <p className="client-page__desc">Đang tải dữ liệu...</p>
      ) : error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : user && data ? (
        <>
          <header className="client-dashboard__header">
            <div className="client-dashboard__profile">
              <FreelancerAvatarFrame
                completedJobs={completedJobs}
                size={48}
                src={avatarSrc}
                alt={displayName}
                fallback={getUserInitials(user.fullName ?? undefined, user.email ?? undefined)}
                className="freelancer-dashboard__header-avatar"
              />
              <div>
                <div className="client-dashboard__name">
                  {displayName}
                  <span className="client-dashboard__meta">
                    {" "}
                    (
                    <Link href="/ho-so/thong-ke">Thống kê của tôi</Link>
                    <span className="client-widget__sep">|</span>
                    <Link href="/ho-so/phan-hoi">
                      {reviewCount > 0 ? `${reviewCount} phản hồi` : "Chưa có phản hồi"}
                    </Link>
                    <span className="client-widget__sep">|</span>
                    <Link href="/ho-so">Sửa hồ sơ</Link> )
                  </span>
                </div>
                {user.tagline ? (
                  <p className="client-dashboard__billing">{user.tagline}</p>
                ) : null}
                {profileSummary ? <p className="client-dashboard__billing">{profileSummary}</p> : null}
                {profile?.title ? (
                  <p className="client-dashboard__billing">
                    {profile.title}
                    {profile.hourly_rate != null ? ` · ${formatVnd(profile.hourly_rate)}/giờ` : ""}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="client-dashboard__cash">
              <div className="client-dashboard__cash-row">
                <FaWallet className="client-dashboard__cash-icon" aria-hidden />
                <span>
                  <strong>Số dư khả dụng:</strong>{" "}
                  <span className="client-dashboard__cash-amount">{formatVnd(balance)}</span>
                </span>
              </div>
              {pendingBalance > 0 ? (
                <div className="client-dashboard__cash-row">
                  <span>
                    <strong>Đang chờ giải ngân:</strong>{" "}
                    <span className="client-dashboard__cash-amount client-dashboard__cash-amount--secondary">
                      {formatVnd(pendingBalance)}
                    </span>
                  </span>
                </div>
              ) : null}
              <Link href="/payments" className="client-dashboard__cash-deposit">
                <FaPlusCircle aria-hidden />
                Xem thanh toán & rút tiền
              </Link>
            </div>
          </header>

          <div className="client-dashboard__grid">
            <DashboardWidget
              title="Công việc đang làm"
              alignLeft
              headLinks={
                <>
                  <Link href="/findwork">Tìm việc</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/jobs">Hợp đồng việc</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/dich-vu/don-hang">Đơn dịch vụ</Link>
                </>
              }
            >
              {workItems.length > 0 ? (
                <WidgetWorkList items={workItems} />
              ) : (
                <>
                  <h3 className="client-widget__title">Sẵn sàng nhận việc?</h3>
                  <Link href="/findwork" className="client-widget__link">
                    Duyệt việc đang mở trên marketplace
                  </Link>
                  <Link href="/findwork/leads" className="client-widget__link">
                    Xem lời mời & cơ hội từ client
                  </Link>
                  <Link href="/findwork/quotes" className="client-widget__link">
                    Quản lý báo giá đã gửi
                  </Link>
                </>
              )}
            </DashboardWidget>

            <DashboardWidget
              title="Dịch vụ"
              alignLeft
              headLinks={
                <>
                  <Link href="/dich-vu/tao-moi">Tạo mới</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/dich-vu/quan-ly">Quản lý</Link>
                </>
              }
            >
              {services.length > 0 ? (
                <WidgetServiceList services={services} />
              ) : (
                <>
                  <h3 className="client-widget__title">Chưa có dịch vụ nào</h3>
                  <Link href="/dich-vu/tao-moi" className="client-widget__link">
                    Tạo gói dịch vụ đầu tiên
                  </Link>
                  <Link href="/ho-so" className="client-widget__link">
                    Hoàn thiện hồ sơ để thu hút khách hàng
                  </Link>
                </>
              )}
            </DashboardWidget>

            <DashboardWidget
              title="Thanh toán"
              alignLeft
              headLinks={<Link href="/payments">Thanh toán</Link>}
            >
              {recentTransactions.length > 0 ? (
                <WidgetPaymentsList transactions={recentTransactions} />
              ) : (
                <>
                  <p className="client-widget__muted">Chưa có giao dịch thu nhập hoặc rút tiền.</p>
                  <Link href="/payments" className="client-widget__link">
                    Thiết lập tài khoản nhận tiền
                  </Link>
                </>
              )}
            </DashboardWidget>
          </div>

          <div className="client-dashboard__grid client-dashboard__grid--duo">
            <ReviewsHighlightPanel profile={profile} reviews={reviews} />
            <ProfileQuickPanel
              user={user}
              profile={profile}
              completionScore={data.completionScore}
              skillsCount={data.skills.length}
              portfolioCount={data.portfolio.length}
            />
          </div>
        </>
      ) : null}
    </FreelancerShell>
  );
}
