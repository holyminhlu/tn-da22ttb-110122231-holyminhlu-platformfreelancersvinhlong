"use client";

import { jobListDetailHref } from "@/lib/routes/paths";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationParams } from "@/lib/i18n/types";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FaLock, FaPlusCircle, FaWallet } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ClientShell from "@/components/layout/ClientShell";
import {
  clientJobToListItem,
  isWorkspaceArchived,
} from "@/components/jobs/jobs-filter";
import { isClientRole } from "@/hooks/useStoredUser";
import { usePagedList } from "@/hooks/usePagedList";
import { getMyWork } from "@/lib/api/contracts";
import {
  getMe,
  isClientMeResponse,
  isFreelancerMeResponse,
  type ClientMeResponse,
  type ClientRecentJob,
  type ClientRecentPayment,
} from "@/lib/api/users";
import { jobContractHref } from "@/lib/findwork/jobContractsDisplay";
import { getUserInitials, persistStoredUser, resolveAvatarSrc, toStoredUser } from "@/lib/authSession";
import DashboardPagination from "./DashboardPagination";
import "./client-dashboard.css";
import "./dashboardPagination.css";

const WIDGET_PAGE_SIZE = 5;

function billingCode(userId: string) {
  const digits = userId.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(0, 10);
  return digits.padStart(10, "0").slice(0, 10) || "0000000000";
}

type TFn = (keyOrVi: string, params?: TranslationParams) => string;

function jobStatusLabel(t: TFn, status: string) {
  const s = status.toLowerCase();
  if (s === "open") return t("dashboardPage.jobStatusOpen");
  if (s === "in_progress") return t("dashboardPage.jobStatusInProgress");
  if (s === "closed") return t("dashboardPage.jobStatusClosed");
  if (s === "cancelled") return t("dashboardPage.jobStatusCancelled");
  return status || "—";
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

function escrowStatusLabel(t: TFn, status: string | null | undefined) {
  const s = String(status || "").toLowerCase();
  if (s === "funded") return t("dashboardPage.escrowFunded");
  if (s === "released") return t("dashboardPage.escrowReleased");
  return s || "—";
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
      <div
        className={`client-widget__body${alignLeft ? " client-widget__body--left" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

function WidgetJobList({ jobs }: { jobs: ClientRecentJob[] }) {
  const { t, formatVnd, formatDate } = useTranslation();
  const { items, page, totalPages, total, setPage } = usePagedList(jobs, WIDGET_PAGE_SIZE);

  return (
    <>
      <ul className="client-widget__list">
        {items.map((job) => (
          <li key={job.id} className="client-widget__list-item">
            <Link href={jobListDetailHref(job.id)} className="client-widget__list-title">
              {job.title}
            </Link>
            <p className="client-widget__list-meta">
              {jobStatusLabel(t, job.status)}
              {job.budget != null ? ` · ${formatVnd(job.budget)}` : ""}
              {" · "}
              {formatDate(job.created_at)}
            </p>
          </li>
        ))}
      </ul>
      <DashboardPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </>
  );
}

function WidgetManageList({
  items,
}: {
  items: ReturnType<typeof clientJobToListItem>[];
}) {
  const { t, formatVnd } = useTranslation();
  const { items: pageItems, page, totalPages, total, setPage } = usePagedList(
    items,
    WIDGET_PAGE_SIZE,
  );

  return (
    <>
      <ul className="client-widget__list">
        {pageItems.map((item) => {
          const isService = Boolean(item.serviceId);
          const href = isService
            ? `/hire/orders/${item.id}`
            : jobContractHref(item, "client");
          return (
            <li key={`${item.jobId}-${item.id}`} className="client-widget__list-item">
              <Link href={href} className="client-widget__list-title">
                {item.title}
              </Link>
              <p className="client-widget__list-meta">
                {item.counterparty ? `${item.counterparty} · ` : ""}
                {item.contractStatus
                  ? contractStatusLabel(t, item.contractStatus)
                  : jobStatusLabel(t, item.jobStatus)}
                {item.agreedPrice != null ? ` · ${formatVnd(item.agreedPrice)}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
      <DashboardPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </>
  );
}

function WidgetPaymentsList({ payments }: { payments: ClientRecentPayment[] }) {
  const { t, formatDate, formatVnd } = useTranslation();
  const { items, page, totalPages, total, setPage } = usePagedList(payments, WIDGET_PAGE_SIZE);

  return (
    <>
      <ul className="client-widget__list">
        {items.map((p) => (
          <li key={p.id} className="client-widget__list-item">
            <span className="client-widget__list-title">{p.title}</span>
            <p className="client-widget__list-meta">
              {formatVnd(p.amount)}
              {p.freelancer_name ? ` · ${p.freelancer_name}` : ""}
              {" · "}
              {escrowStatusLabel(t, p.escrow_status)}
              {" · "}
              {formatDate(p.paid_at)}
            </p>
          </li>
        ))}
      </ul>
      <DashboardPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </>
  );
}

export default function ClientDashboard() {
  const { t, formatVnd } = useTranslation();

  const [data, setData] = useState<ClientMeResponse | null>(null);
  const [manageItems, setManageItems] = useState<ReturnType<typeof clientJobToListItem>[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [me, work] = await Promise.all([getMe(), getMyWork()]);
        if (cancelled) return;
        if (isFreelancerMeResponse(me) || !isClientMeResponse(me) || !isClientRole(me.user?.role)) {
          setError(t("dashboardPage.notClientAccount"));
          setData(null);
          setManageItems([]);
          return;
        }
        setData(me);
        if (me.user) {
          persistStoredUser(
            toStoredUser({
              id: me.user.id,
              email: me.user.email,
              role: me.user.role,
              fullName: me.user.fullName,
              avatarUrl: me.user.avatarUrl,
            }),
          );
        }
        if (work.role === "client") {
          const active = (work.jobs ?? [])
            .map(clientJobToListItem)
            .filter((i) => !isWorkspaceArchived(i.contractStatus, i.jobStatus));
          setManageItems(active);
        } else {
          setManageItems([]);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : t("dashboardPage.loadError");
        setError(message);
        setData(null);
        setManageItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const user = data?.user;
  const displayName = user?.fullName?.trim() || user?.email || "—";
  const avatarSrc = resolveAvatarSrc(user?.avatarUrl);
  const balance = data?.account?.balance ?? 0;
  const escrowBalance = data?.account?.escrowBalance ?? 0;
  const reviewCount = data?.reviews?.length ?? 0;
  const recentJobs = data?.recentJobs ?? [];
  const recentPayments = data?.recentPayments ?? [];
  const stats = data?.clientStats;

  const statsSummary = useMemo(() => {
    if (!stats) return null;
    return t("dashboardPage.statsSummary", {
      total: Number(stats.total_jobs) || 0,
      open: Number(stats.open_jobs) || 0,
      contracts: Number(stats.total_contracts) || 0,
    });
  }, [stats, t]);

  return (
    <ClientShell wide>
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
              <Avatar className="client-dashboard__avatar size-12 shrink-0">
                {avatarSrc ? (
                  <AvatarImage src={avatarSrc} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-[#e8f1fb] text-[#0066cc]">
                  {getUserInitials(user.fullName ?? undefined, user.email ?? undefined)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="client-dashboard__name">
                  {displayName}
                  <span className="client-dashboard__meta">
                    {" "}
                    ({" "}
                    <Link href="/ho-so/thong-ke">{t("dashboardPage.myStats")}</Link>
                    <span className="client-widget__sep">|</span>
                    <Link href="/ho-so/phan-hoi">
                      {reviewCount > 0
                        ? t("dashboardPage.feedbackCount", { count: reviewCount })
                        : t("dashboardPage.noFeedback")}
                    </Link>{" "}
                    )
                  </span>
                </div>
                <p className="client-dashboard__billing">
                  {t("dashboardPage.billingCode", { code: billingCode(user.id) })}
                </p>
                {statsSummary ? (
                  <p className="client-dashboard__billing">{statsSummary}</p>
                ) : null}
              </div>
            </div>
            <div className="client-dashboard__cash">
              <div className="client-dashboard__cash-row">
                <FaWallet className="client-dashboard__cash-icon" aria-hidden />
                <span>
                  <strong>{t("dashboardPage.cashAccount")}</strong>{" "}
                  <span className="client-dashboard__cash-amount">{formatVnd(balance)}</span>
                </span>
              </div>
              {escrowBalance > 0 ? (
                <div className="client-dashboard__cash-row">
                  <FaLock className="client-dashboard__cash-icon client-dashboard__cash-icon--escrow" aria-hidden />
                  <span>
                    <strong>{t("dashboardPage.escrow")}</strong>{" "}
                    <span className="client-dashboard__cash-amount client-dashboard__cash-amount--secondary">
                      {formatVnd(escrowBalance)}
                    </span>
                  </span>
                </div>
              ) : null}
              <Link href="/payments" className="client-dashboard__cash-deposit">
                <FaPlusCircle aria-hidden />
                {t("dashboardPage.deposit")}
              </Link>
            </div>
          </header>

          <div className="client-dashboard__grid">
            <DashboardWidget
              title={t("dashboardPage.hireWidget")}
              alignLeft
              headLinks={
                <>
                  <Link href="/hire/post">{t("dashboardPage.postJob")}</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/hire/joblist">{t("dashboardPage.jobList")}</Link>
                </>
              }
            >
              {recentJobs.length > 0 ? (
                <WidgetJobList jobs={recentJobs} />
              ) : (
                <>
                  <h3 className="client-widget__title">{t("dashboardPage.readyToHire")}</h3>
                  <Link href="/hire/post" className="client-widget__link">
                    {t("dashboardPage.postAndQuote")}
                  </Link>
                  <Link href="/hire/search" className="client-widget__link">
                    {t("dashboardPage.findExpert")}
                  </Link>
                  <Link href="/hire" className="client-widget__link">
                    {t("dashboardPage.rehire")}
                  </Link>
                </>
              )}
            </DashboardWidget>

            <DashboardWidget
              title={t("dashboardPage.manageWidget")}
              alignLeft
              headLinks={<Link href="/manage">{t("dashboardPage.myManagers")}</Link>}
            >
              {manageItems.length > 0 ? (
                <WidgetManageList items={manageItems} />
              ) : (
                <p className="client-widget__muted">{t("dashboardPage.noManageWork")}</p>
              )}
            </DashboardWidget>

            <DashboardWidget
              title={t("dashboardPage.paymentsWidget")}
              alignLeft
              headLinks={<Link href="/payments">{t("dashboardPage.paymentsWidget")}</Link>}
            >
              {recentPayments.length > 0 ? (
                <WidgetPaymentsList payments={recentPayments} />
              ) : (
                <p className="client-widget__muted">{t("dashboardPage.noPayments")}</p>
              )}
            </DashboardWidget>
          </div>
        </>
      ) : null}
    </ClientShell>
  );
}
