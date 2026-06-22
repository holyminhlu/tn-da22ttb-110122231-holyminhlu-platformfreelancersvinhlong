"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaChartBar,
  FaComments,
  FaExclamationTriangle,
  FaHandshake,
  FaMoneyBillWave,
  FaRedo,
  FaUserCheck,
  FaUsers,
  FaWallet,
} from "react-icons/fa";
import { getAdminStatsOverview, type AdminStatsPayload } from "@/lib/api/adminStats";
import { ADMIN_HOME, ROUTES } from "@/lib/routes/paths";
import {
  AdminBarChart,
  AdminDonutChart,
  AdminTrendChart,
  formatVndShort,
  roleLabel,
} from "./AdminCharts";
import "./admin.css";

function formatVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} ₫`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatUpdatedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type KpiCard = {
  label: string;
  value: string;
  hint?: string;
  icon: typeof FaUsers;
  tone?: "default" | "warn" | "ok";
  href?: string;
};

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await getAdminStatsOverview();
      setData(payload);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải báo cáo.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overview = data?.overview;

  const kpiCards: KpiCard[] = overview
    ? [
        {
          label: "Tổng người dùng",
          value: formatCount(overview.totalUsers),
          hint: `+${formatCount(overview.newUsers7d)} / 7 ngày`,
          icon: FaUsers,
        },
        {
          label: "Khách hàng",
          value: formatCount(overview.totalClients),
          icon: FaUsers,
        },
        {
          label: "Freelancer",
          value: formatCount(overview.totalFreelancers),
          icon: FaUsers,
        },
        {
          label: "Chờ duyệt xác minh",
          value: formatCount(overview.pendingApprovals),
          icon: FaUserCheck,
          tone: overview.pendingApprovals > 0 ? "warn" : "default",
          href: ADMIN_HOME,
        },
        {
          label: "Hoàn tiền chờ xử lý",
          value: formatCount(overview.pendingRefunds),
          icon: FaRedo,
          tone: overview.pendingRefunds > 0 ? "warn" : "default",
          href: ROUTES.admin.refunds,
        },
        {
          label: "Tranh chấp mở",
          value: formatCount(overview.openDisputes),
          icon: FaExclamationTriangle,
          tone: overview.openDisputes > 0 ? "warn" : "default",
          href: ROUTES.admin.disputes,
        },
        {
          label: "Rút tiền chờ duyệt",
          value: formatCount(overview.pendingWithdrawals),
          icon: FaWallet,
          tone: overview.pendingWithdrawals > 0 ? "warn" : "default",
          href: ROUTES.admin.withdrawals,
        },
        {
          label: "GMV đã giải ngân",
          value: formatVndShort(overview.gmvReleased) + " ₫",
          hint: `${formatCount(overview.completedContracts)} đơn hoàn thành`,
          icon: FaMoneyBillWave,
          tone: "ok",
        },
        {
          label: "Escrow đang giữ",
          value: formatVndShort(overview.totalEscrow) + " ₫",
          icon: FaHandshake,
        },
        {
          label: "Hài lòng (≥4★)",
          value: `${overview.satisfactionRate}%`,
          icon: FaChartBar,
          tone: "ok",
        },
        {
          label: "Tổng hợp đồng",
          value: formatCount(overview.totalContracts),
          hint: `${formatCount(overview.newUsers30d)} user mới / 30 ngày`,
          icon: FaHandshake,
        },
        {
          label: "Tin nhắn (30 ngày)",
          value: formatCount(data?.usage.chatMessages30d ?? 0),
          hint: `${formatCount(data?.usage.chatConversations ?? 0)} hội thoại`,
          icon: FaComments,
        },
      ]
    : [];

  return (
    <div className="admin-page admin-reports-page">
      <header className="admin-page__head admin-reports-page__head">
        <div>
          <h1 className="admin-page__title">{t("Báo cáo thống kê")}</h1>
          <p className="admin-page__lead">
            {t("Tổng quan vận hành nền tảng: người dùng, đơn hàng, thanh toán và mức độ sử dụng.")}
          </p>
        </div>
        <button type="button" className="admin-reports-page__refresh" onClick={() => void load()} disabled={loading}>
          <FaRedo aria-hidden className={loading ? "admin-reports-page__spin" : ""} />
          {t("Làm mới")}
        </button>
      </header>

      {error ? (
        <div className="admin-reports-page__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="admin-reports-page__loading">{t("Đang tải số liệu…")}</p>
      ) : null}

      {data ? (
        <>
          <p className="admin-reports-page__updated">
            {t("Cập nhật")}: {formatUpdatedAt(data.updatedAt)}
          </p>

          <section className="admin-reports-kpi" aria-label={t("Chỉ số tổng quan")}>
            {kpiCards.map((card) => {
              const Icon = card.icon;
              const inner = (
                <>
                  <span className={`admin-reports-kpi__icon admin-reports-kpi__icon--${card.tone || "default"}`}>
                    <Icon aria-hidden />
                  </span>
                  <div className="admin-reports-kpi__body">
                    <span className="admin-reports-kpi__label">{t(card.label)}</span>
                    <strong className="admin-reports-kpi__value">{card.value}</strong>
                    {card.hint ? <span className="admin-reports-kpi__hint">{card.hint}</span> : null}
                  </div>
                </>
              );
              return card.href ? (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`admin-reports-kpi__card admin-reports-kpi__card--link admin-reports-kpi__card--${card.tone || "default"}`}
                >
                  {inner}
                </Link>
              ) : (
                <article
                  key={card.label}
                  className={`admin-reports-kpi__card admin-reports-kpi__card--${card.tone || "default"}`}
                >
                  {inner}
                </article>
              );
            })}
          </section>

          <section className="admin-reports-grid admin-reports-grid--trends">
            <AdminTrendChart
              data={data.trends.users}
              title={t("Đăng ký mới (30 ngày)")}
              color="#2563eb"
            />
            <AdminTrendChart
              data={data.trends.contractsCreated}
              title={t("Hợp đồng tạo mới (30 ngày)")}
              color="#0ea5e9"
            />
            <AdminTrendChart
              data={data.trends.contractsReleased}
              title={t("Giải ngân theo ngày (30 ngày)")}
              color="#10b981"
              showAmount
            />
            <AdminTrendChart
              data={data.trends.withdrawals}
              title={t("Rút tiền thành công (30 ngày)")}
              color="#f59e0b"
              showAmount
            />
          </section>

          <section className="admin-reports-grid admin-reports-grid--2">
            <AdminDonutChart
              title={t("Người dùng theo vai trò")}
              data={data.usersByRole.map((r) => ({
                label: roleLabel(r.role),
                value: r.count,
              }))}
            />
            <AdminBarChart
              title={t("Hợp đồng theo giai đoạn")}
              data={data.contractsByStage.map((s) => ({
                label: s.label,
                value: s.count,
              }))}
            />
          </section>

          <section className="admin-reports-grid admin-reports-grid--2">
            <AdminBarChart
              title={t("Hàng đợi xử lý")}
              data={[
                { label: "Duyệt xác minh", value: overview?.pendingApprovals ?? 0, color: "#2563eb" },
                { label: "Hoàn tiền", value: data.queue.refunds.pending, color: "#f59e0b" },
                { label: "Tranh chấp", value: data.queue.disputes.open, color: "#ef4444" },
                { label: "Rút tiền", value: data.queue.withdrawals.pending, color: "#8b5cf6" },
              ]}
            />
            <AdminBarChart
              title={t("Đã xử lý (lịch sử)")}
              data={[
                { label: "Hoàn tiền", value: data.queue.refunds.resolved, color: "#10b981" },
                { label: "Tranh chấp", value: data.queue.disputes.resolved, color: "#64748b" },
                { label: "Rút tiền OK", value: data.queue.withdrawals.paid, color: "#0ea5e9" },
                { label: "Rút tiền lỗi", value: data.queue.withdrawals.failed, color: "#ef4444" },
              ]}
            />
          </section>

          <section className="admin-reports-usage">
            <h2 className="admin-reports-usage__title">{t("Mức độ sử dụng (30 ngày)")}</h2>
            <div className="admin-reports-usage__summary">
              <div className="admin-reports-usage__stat">
                <strong>{formatCount(data.usage.profileEvents30d)}</strong>
                <span>{t("Sự kiện hồ sơ / dịch vụ")}</span>
              </div>
              <div className="admin-reports-usage__stat">
                <strong>{formatCount(data.usage.chatMessages30d)}</strong>
                <span>{t("Tin nhắn chat")}</span>
              </div>
              <div className="admin-reports-usage__stat">
                <strong>{formatCount(data.usage.chatConversations)}</strong>
                <span>{t("Hội thoại tích lũy")}</span>
              </div>
            </div>
            {data.usage.profileEventsByType.length > 0 ? (
              <AdminBarChart
                title={t("Sự kiện theo loại")}
                data={data.usage.profileEventsByType.map((e) => ({
                  label: e.label,
                  value: e.count,
                }))}
              />
            ) : (
              <p className="admin-reports-page__empty">
                {t("Chưa có dữ liệu analytics hồ sơ. Chạy backend/sql/profile_analytics.sql nếu cần.")}
              </p>
            )}
          </section>

          <section className="admin-reports-finance">
            <h2 className="admin-reports-finance__title">{t("Tài chính tóm tắt")}</h2>
            <dl className="admin-reports-finance__list">
              <div>
                <dt>{t("GMV giải ngân")}</dt>
                <dd>{formatVnd(overview?.gmvReleased ?? 0)}</dd>
              </div>
              <div>
                <dt>{t("Escrow đang giữ")}</dt>
                <dd>{formatVnd(overview?.totalEscrow ?? 0)}</dd>
              </div>
              <div>
                <dt>{t("Đơn hoàn thành")}</dt>
                <dd>{formatCount(overview?.completedContracts ?? 0)}</dd>
              </div>
              <div>
                <dt>{t("Tỷ lệ hài lòng")}</dt>
                <dd>{overview?.satisfactionRate ?? 0}%</dd>
              </div>
            </dl>
          </section>
        </>
      ) : null}
    </div>
  );
}
