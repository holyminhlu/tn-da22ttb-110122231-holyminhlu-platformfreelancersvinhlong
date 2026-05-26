"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getProfileStats,
  type ProfileStatsPeriod,
  type ProfileStatsResponse,
} from "@/lib/api/users";
import ProfileViewsChart from "./ProfileViewsChart";
import StatsPeriodSelect from "./StatsPeriodSelect";
import "./profile-stats.css";

function StatsTable({
  headers,
  rows,
  emptyColSpan,
}: {
  headers: string[];
  rows: (string | number)[][];
  emptyColSpan: number;
}) {
  return (
    <div className="ps-table-wrap">
      <table className="ps-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={emptyColSpan} className="ps-table__empty">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ProfileStatsContent() {
  const router = useRouter();
  const [period, setPeriod] = useState<ProfileStatsPeriod>("30d");
  const [stats, setStats] = useState<ProfileStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (p: ProfileStatsPeriod) => {
    setLoading(true);
    setError("");
    try {
      const data = await getProfileStats(p);
      setStats(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải thống kê hồ sơ.";
      setError(message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      router.replace("/dang-nhap");
      return;
    }
    void load(period);
  }, [load, period, router]);

  return (
    <div className="ps-page">
      <h1 className="ps-heading">Thống kê hồ sơ của bạn</h1>

      {loading ? (
        <p className="ps-loading">Đang tải thống kê...</p>
      ) : error ? (
        <p className="ps-error" role="alert">
          {error}
        </p>
      ) : stats ? (
        <>
          <section className="ps-section" aria-labelledby="ps-views-title">
            <div className="ps-section__head">
              <h2 id="ps-views-title" className="ps-section__title">
                Lượt xem hồ sơ
              </h2>
              <StatsPeriodSelect
                value={period}
                onChange={setPeriod}
                ariaLabel="Lượt xem hồ sơ — khoảng thời gian"
              />
            </div>
            <ProfileViewsChart series={stats.profile_views.series} />
            <p className="ps-summary">{stats.profile_views.summary}</p>
          </section>

          <section className="ps-section" aria-labelledby="ps-conversion-title">
            <h2 id="ps-conversion-title" className="ps-section__title">
              Chuyển đổi hồ sơ
            </h2>
            <div className="ps-metrics">
              <div className="ps-metric">
                <p className="ps-metric__label">Đã nhận được thư mời làm việc</p>
                <p className="ps-metric__value">{stats.conversion.work_invitations}</p>
              </div>
              <div className="ps-metric">
                <p className="ps-metric__label">Lượt nhấp chuột vào trang web cá nhân</p>
                <p className="ps-metric__value">{stats.conversion.website_clicks}</p>
              </div>
            </div>
          </section>

          <section className="ps-section" aria-labelledby="ps-services-title">
            <div className="ps-section__head">
              <h2 id="ps-services-title" className="ps-section__title">
                Tổng quan về dịch vụ
              </h2>
              <StatsPeriodSelect
                value={period}
                onChange={setPeriod}
                ariaLabel="Dịch vụ — khoảng thời gian"
              />
            </div>
            <StatsTable
              headers={["Tên dịch vụ", "Tổng lượt xem", "Chuyển đổi", "Tỷ lệ chuyển đổi"]}
              rows={stats.services.map((s) => [
                s.title,
                s.views,
                s.conversions,
                s.views > 0 ? `${s.conversion_rate}%` : "—",
              ])}
              emptyColSpan={4}
            />
          </section>

          <section className="ps-section" aria-labelledby="ps-portfolio-title">
            <div className="ps-section__head">
              <h2 id="ps-portfolio-title" className="ps-section__title">
                Tổng quan danh mục đầu tư
              </h2>
              <StatsPeriodSelect
                value={period}
                onChange={setPeriod}
                ariaLabel="Portfolio — khoảng thời gian"
              />
            </div>
            <StatsTable
              headers={["Tên bộ sưu tập tác phẩm", "Tổng lượt xem"]}
              rows={stats.portfolio.map((p) => [p.title, p.views])}
              emptyColSpan={2}
            />
          </section>

          <section className="ps-section" aria-labelledby="ps-marketing-title">
            <h2 id="ps-marketing-title" className="ps-section__title">
              Tổng điểm tiếp thị
            </h2>
            <div className="ps-marketing">
              <div className="ps-tms">
                <p className="ps-tms__score">{stats.marketing.tms}</p>
                <p className="ps-tms__label">Điểm Marketing Tổng Thể (TMS)</p>
                <p className="ps-tms__sub">Thang điểm 0–100</p>
              </div>
              <div>
                <div className="ps-scores">
                  <div className="ps-score-item">
                    <p className="ps-score-item__val">{stats.marketing.car}%</p>
                    <p className="ps-score-item__key">CAR</p>
                  </div>
                  <div className="ps-score-item">
                    <p className="ps-score-item__val">{stats.marketing.cer}%</p>
                    <p className="ps-score-item__key">CER</p>
                  </div>
                  <div className="ps-score-item">
                    <p className="ps-score-item__val">{stats.marketing.crr}%</p>
                    <p className="ps-score-item__key">CRR</p>
                  </div>
                </div>
                <p className="ps-marketing__desc">
                  Điểm Marketing Tổng Thể (TMS) tính hiệu suất kinh doanh tổng thể, tóm tắt ba
                  chỉ số: Tỷ lệ Thu hút Khách hàng (CAR), Tỷ lệ Tăng trưởng Khách hàng (CER) và
                  Tỷ lệ Giữ chân Khách hàng (CRR).
                </p>
                <Link href="/help/freelancer" className="ps-marketing__link">
                  Tìm hiểu thêm về Điểm Tiếp thị của bạn ➝
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
