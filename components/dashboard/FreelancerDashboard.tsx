"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationParams } from "@/lib/i18n/types";
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
import {
  isActiveJobContract,
  isJobOnlyContract,
  jobContractHref,
} from "@/lib/findwork/jobContractsDisplay";
import DashboardPagination from "./DashboardPagination";
import "./dashboard.css";
import "./dashboardPagination.css";

const WIDGET_PAGE_SIZE = 5;

type TFn = (keyOrVi: string, params?: TranslationParams) => string;

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

function contractStatusLabel(t: TFn, status: string) {
  const s = status.toLowerCase().trim();
  if (s === "active") return t("dashboardPage.contractActive");
  if (s === "pending") return t("dashboardPage.contractPending");
  if (s === "completed") return t("dashboardPage.contractCompleted");
  if (s === "cancelled") return t("dashboardPage.contractCancelled");
  if (s === "in_progress") return t("dashboardPage.contractInProgress");
  if (s === "open") return t("dashboardPage.contractOpen");
  if (s === "closed") return t("dashboardPage.contractClosed");
  return status || "—";
}

function workflowStageLabel(t: TFn, stage: string) {
  const s = String(stage).toLowerCase();
  if (s === "selection") return t("dashboardPage.stageSelection");
  if (s === "escrow") return t("dashboardPage.stageEscrow");
  if (s === "execution") return t("dashboardPage.stageExecution");
  if (s === "delivery") return t("dashboardPage.stageDelivery");
  if (s === "completion") return t("dashboardPage.stageCompletion");
  return stage;
}

function jobContractStageLabel(t: TFn, item: JobsListItem): string {
  if (item.workflowStage) {
    return workflowStageLabel(t, item.workflowStage);
  }
  return contractStatusLabel(t, item.contractStatus);
}

function freelancerTransactionCategoryLabel(t: TFn, category: string) {
  switch (category) {
    case "escrow_release":
    case "milestone":
      return t("dashboardPage.txEscrowRelease");
    case "withdraw":
      return t("dashboardPage.txWithdraw");
    case "processing_fee":
      return t("dashboardPage.txProcessingFee");
    case "refund":
      return t("dashboardPage.txRefund");
    case "deposit":
      return t("dashboardPage.txDeposit");
    default:
      return category || "—";
  }
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
  const { t, formatVnd } = useTranslation();
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
              {jobContractStageLabel(t, item)}
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
  const { t, formatVnd } = useTranslation();
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
              {service.delivery_days != null
                ? ` · ${t("dashboardPage.deliveryDays", { days: service.delivery_days })}`
                : ""}
            </p>
          </li>
        ))}
      </ul>
      <DashboardPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </>
  );
}

function WidgetPaymentsList({ transactions }: { transactions: FreelancerTransaction[] }) {
  const { t, formatDate, formatVnd } = useTranslation();
  const { items, page, totalPages, total, setPage } = usePagedList(transactions, WIDGET_PAGE_SIZE);

  return (
    <>
      <ul className="client-widget__list">
        {items.map((tx) => (
          <li key={tx.id} className="client-widget__list-item">
            <span className="client-widget__list-title">
              {tx.projectTitle || t("dashboardPage.transactionDefault")}
            </span>
            <p className="client-widget__list-meta">
              {formatVnd(tx.amount)}
              {tx.clientName ? ` · ${tx.clientName}` : ""}
              {" · "}
              {freelancerTransactionCategoryLabel(t, tx.category)}
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
  const { t } = useTranslation();
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span
      className={`fd-stars fd-stars--${size}`}
      aria-label={t("dashboardPage.starRatingAria", { rating: rating.toFixed(1) })}
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
  const { t, formatDate } = useTranslation();
  const avg = profile ? Number(profile.rating_avg) : 0;
  const totalReviews = profile?.total_reviews ?? reviews.length;
  const successScore = profile?.job_success_score;
  const featured = reviews[0];
  const recent = reviews.slice(0, 3);

  return (
    <DashboardWidget
      title={t("dashboardPage.reviews")}
      alignLeft
      headLinks={<Link href="/ho-so/phan-hoi">{t("dashboardPage.allFeedback")}</Link>}
    >
      <div className="fd-widget-block">
        <div className="fd-reviews-hero">
          <div className="fd-reviews-score">
            <p className="fd-reviews-score__value">{avg > 0 ? avg.toFixed(1) : "—"}</p>
            <StarRating rating={avg > 0 ? avg : 0} />
            <p className="fd-reviews-score__caption">
              {totalReviews > 0
                ? t("dashboardPage.reviewCount", { count: totalReviews })
                : t("dashboardPage.noReviews")}
            </p>
          </div>
          {successScore != null ? (
            <div className="fd-reviews-metric">
              <p className="fd-reviews-metric__value">{successScore}%</p>
              <p className="fd-reviews-metric__label">{t("dashboardPage.successRate")}</p>
            </div>
          ) : null}
        </div>

        {featured ? (
          <blockquote className="fd-review-featured">
            <FaQuoteLeft className="fd-review-featured__icon" aria-hidden />
            <p className="fd-review-featured__text">
              {featured.comment?.trim() || t("dashboardPage.clientLeftRating")}
            </p>
            <footer className="fd-review-featured__foot">
              <StarRating rating={featured.rating} size="sm" />
              <span>
                {featured.reviewer_name || t("dashboardPage.client")} · {formatDate(featured.created_at)}
              </span>
            </footer>
          </blockquote>
        ) : (
          <div className="fd-review-empty">
            <h3 className="client-widget__title">{t("dashboardPage.noFeedbackYet")}</h3>
            <p className="client-widget__muted">{t("dashboardPage.noFeedbackHint")}</p>
            <Link href="/findwork" className="client-widget__link">
              {t("dashboardPage.findWorkNow")}
            </Link>
          </div>
        )}

        {recent.length > 1 ? (
          <ul className="client-widget__list fd-review-mini-list">
            {recent.slice(featured ? 1 : 0).map((review) => (
              <li key={review.id} className="client-widget__list-item">
                <p className="client-widget__list-title">
                  {review.reviewer_name || t("dashboardPage.client")}
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
  const { t } = useTranslation();
  const emailOk = Boolean(user.isEmailVerified);
  const phoneOk = Boolean(user.isPhoneVerified);
  const availability = String(profile?.availability_status || "").toLowerCase();

  const availabilityLabel =
    availability === "available"
      ? t("dashboardPage.available")
      : availability === "busy"
        ? t("dashboardPage.busy")
        : availability === "unavailable"
          ? t("dashboardPage.unavailable")
          : t("dashboardPage.notUpdated");

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
      title={t("dashboardPage.profileQuick")}
      alignLeft
      headLinks={<Link href="/ho-so">{t("dashboardPage.editProfile")}</Link>}
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
              <span>{t("dashboardPage.complete")}</span>
            </div>
          </div>
          <div className="fd-profile-top__meta">
            <span className={`fd-pill ${availabilityClass}`}>{availabilityLabel}</span>
            <p className="fd-profile-top__hint">
              {completionScore >= 100
                ? t("dashboardPage.profileComplete")
                : t("dashboardPage.profileIncomplete", { percent: 100 - completionScore })}
            </p>
          </div>
        </div>

        <div className="fd-profile-stats">
          <Link href="/ho-so?add=skills" className="fd-stat-card fd-stat-card--skills">
            <span className="fd-stat-card__icon" aria-hidden>
              <FaTools />
            </span>
            <strong className="fd-stat-card__value">{skillsCount}</strong>
            <span className="fd-stat-card__label">{t("dashboardPage.skills")}</span>
          </Link>
          <Link href="/ho-so?add=portfolio" className="fd-stat-card fd-stat-card--portfolio">
            <span className="fd-stat-card__icon" aria-hidden>
              <FaFolderOpen />
            </span>
            <strong className="fd-stat-card__value">{portfolioCount}</strong>
            <span className="fd-stat-card__label">{t("dashboardPage.projects")}</span>
          </Link>
        </div>

        <div className="fd-verify-row">
          <span className={`fd-verify-badge${emailOk ? " fd-verify-badge--ok" : ""}`}>
            {emailOk ? <FaCheckCircle aria-hidden /> : null}
            {emailOk ? t("dashboardPage.emailVerified") : t("dashboardPage.emailUnverified")}
          </span>
          <span className={`fd-verify-badge${phoneOk ? " fd-verify-badge--ok" : ""}`}>
            {phoneOk ? <FaCheckCircle aria-hidden /> : null}
            {phoneOk ? t("dashboardPage.phoneVerified") : t("dashboardPage.phoneUnverified")}
          </span>
        </div>

        {completionScore < 100 ? (
          <Link href="/ho-so" className="client-widget__link fd-widget-action">
            <FaUserEdit className="mr-1 inline" aria-hidden />
            {t("dashboardPage.completeProfileNow")}
          </Link>
        ) : (
          <Link href="/ho-so/thong-ke" className="client-widget__link fd-widget-action">
            {t("dashboardPage.viewProfileStats")}
          </Link>
        )}
      </div>
    </DashboardWidget>
  );
}

export default function FreelancerDashboard() {
  const { t, formatVnd } = useTranslation();

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
        setError(t("dashboardPage.notFreelancerAccount"));
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
      setError(apiErrorMessage(err, t("dashboardPage.loadError")));
      setData(null);
      setWorkItems([]);
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, [router, t]);

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
    if (data?.completionScore != null) {
      parts.push(t("dashboardPage.profilePercent", { percent: data.completionScore }));
    }
    if (completedJobs > 0) {
      parts.push(t("dashboardPage.completedOrders", { count: completedJobs }));
    }
    const avg = profile ? Number(profile.rating_avg) : 0;
    if (avg > 0) parts.push(`★ ${avg.toFixed(1)}`);
    return parts.join(" · ") || null;
  }, [completedJobs, data?.completionScore, profile, t]);

  return (
    <FreelancerShell wide>
      {loading ? (
        <p className="client-page__desc">{t("dashboardPage.loading")}</p>
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
                    <Link href="/ho-so/thong-ke">{t("dashboardPage.myStats")}</Link>
                    <span className="client-widget__sep">|</span>
                    <Link href="/ho-so/phan-hoi">
                      {reviewCount > 0
                        ? t("dashboardPage.feedbackCount", { count: reviewCount })
                        : t("dashboardPage.noFeedback")}
                    </Link>
                    <span className="client-widget__sep">|</span>
                    <Link href="/ho-so">{t("dashboardPage.editProfileShort")}</Link> )
                  </span>
                </div>
                {user.tagline ? (
                  <p className="client-dashboard__billing">{user.tagline}</p>
                ) : null}
                {profileSummary ? <p className="client-dashboard__billing">{profileSummary}</p> : null}
                {profile?.title ? (
                  <p className="client-dashboard__billing">
                    {profile.title}
                    {profile.hourly_rate != null
                      ? ` · ${t("dashboardPage.hourlyRate", { rate: formatVnd(profile.hourly_rate) })}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="client-dashboard__cash">
              <div className="client-dashboard__cash-row">
                <FaWallet className="client-dashboard__cash-icon" aria-hidden />
                <span>
                  <strong>{t("dashboardPage.availableBalance")}</strong>{" "}
                  <span className="client-dashboard__cash-amount">{formatVnd(balance)}</span>
                </span>
              </div>
              {pendingBalance > 0 ? (
                <div className="client-dashboard__cash-row">
                  <span>
                    <strong>{t("dashboardPage.pendingPayout")}</strong>{" "}
                    <span className="client-dashboard__cash-amount client-dashboard__cash-amount--secondary">
                      {formatVnd(pendingBalance)}
                    </span>
                  </span>
                </div>
              ) : null}
              <Link href="/payments" className="client-dashboard__cash-deposit">
                <FaPlusCircle aria-hidden />
                {t("dashboardPage.viewPaymentsWithdraw")}
              </Link>
            </div>
          </header>

          <div className="client-dashboard__grid">
            <DashboardWidget
              title={t("dashboardPage.activeWorkWidget")}
              alignLeft
              headLinks={
                <>
                  <Link href="/findwork">{t("dashboardPage.findWork")}</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/jobs">{t("dashboardPage.jobContracts")}</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/dich-vu/don-hang">{t("dashboardPage.serviceOrders")}</Link>
                </>
              }
            >
              {workItems.length > 0 ? (
                <WidgetWorkList items={workItems} />
              ) : (
                <>
                  <h3 className="client-widget__title">{t("dashboardPage.readyForWork")}</h3>
                  <Link href="/findwork" className="client-widget__link">
                    {t("dashboardPage.browseOpenJobs")}
                  </Link>
                  <Link href="/findwork/leads" className="client-widget__link">
                    {t("dashboardPage.viewLeads")}
                  </Link>
                  <Link href="/findwork/quotes" className="client-widget__link">
                    {t("dashboardPage.manageQuotes")}
                  </Link>
                </>
              )}
            </DashboardWidget>

            <DashboardWidget
              title={t("dashboardPage.servicesWidget")}
              alignLeft
              headLinks={
                <>
                  <Link href="/dich-vu/tao-moi">{t("dashboardPage.createNew")}</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/dich-vu/quan-ly">{t("dashboardPage.manageLink")}</Link>
                </>
              }
            >
              {services.length > 0 ? (
                <WidgetServiceList services={services} />
              ) : (
                <>
                  <h3 className="client-widget__title">{t("dashboardPage.noServices")}</h3>
                  <Link href="/dich-vu/tao-moi" className="client-widget__link">
                    {t("dashboardPage.createFirstService")}
                  </Link>
                  <Link href="/ho-so" className="client-widget__link">
                    {t("dashboardPage.completeProfileAttract")}
                  </Link>
                </>
              )}
            </DashboardWidget>

            <DashboardWidget
              title={t("dashboardPage.paymentsWidget")}
              alignLeft
              headLinks={<Link href="/payments">{t("dashboardPage.paymentsWidget")}</Link>}
            >
              {recentTransactions.length > 0 ? (
                <WidgetPaymentsList transactions={recentTransactions} />
              ) : (
                <>
                  <p className="client-widget__muted">{t("dashboardPage.noIncomeTransactions")}</p>
                  <Link href="/payments" className="client-widget__link">
                    {t("dashboardPage.setupPayoutAccount")}
                  </Link>
                </>
              )}
            </DashboardWidget>
          </div>

          <div className="client-dashboard__grid client-dashboard__grid--duo">
            <ReviewsHighlightPanel profile={profile ?? null} reviews={reviews} />
            <ProfileQuickPanel
              user={user}
              profile={profile ?? null}
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
