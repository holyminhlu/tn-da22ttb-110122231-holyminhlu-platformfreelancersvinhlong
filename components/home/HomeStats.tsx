"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useMemo, useState } from "react";
import { getPublicHomeStats, type HomeStatsPayload } from "@/lib/api/publicStats";
import { StatIcon } from "./icons";

const FALLBACK_STATS: HomeStatsPayload = {
  totalClients: 800000,
  paidInvoices: 1000000,
  paidToFreelancers: 6250000000000,
  satisfactionRate: 99,
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatInvoiceCount(value: number): string {
  if (value >= 1_000_000) {
    const mil = value / 1_000_000;
    return `${Number.isInteger(mil) ? mil : mil.toFixed(1)} triệu`;
  }
  return formatCount(value);
}

function formatPayoutVnd(value: number): string {
  if (value >= 1_000_000_000) {
    const bil = value / 1_000_000_000;
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(bil)} tỷ ₫`;
  }
  return `${formatCount(value)} ₫`;
}

export default function HomeStats() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<HomeStatsPayload>(FALLBACK_STATS);

  useEffect(() => {
    let mounted = true;
    getPublicHomeStats()
      .then((data) => {
        if (!mounted || !data?.stats) return;
        setStats({
          totalClients: Math.max(0, Number(data.stats.totalClients) || 0),
          paidInvoices: Math.max(0, Number(data.stats.paidInvoices) || 0),
          paidToFreelancers: Math.max(0, Number(data.stats.paidToFreelancers) || 0),
          satisfactionRate: Math.min(100, Math.max(0, Number(data.stats.satisfactionRate) || 0)),
        });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const displayStats = useMemo(
    () => [
      { icon: "users" as const, value: formatCount(stats.totalClients), label: "Khách hàng trên toàn cầu" },
      { icon: "invoice" as const, value: formatInvoiceCount(stats.paidInvoices), label: "Hóa đơn đã thanh toán" },
      {
        icon: "money" as const,
        value: formatPayoutVnd(stats.paidToFreelancers),
        label: "Đã thanh toán cho freelancer",
      },
      {
        icon: "thumbs" as const,
        value: `${stats.satisfactionRate}%`,
        label: "Tỷ lệ hài lòng khách hàng",
        highlight: true,
      },
    ],
    [stats],
  );

  return (
    <div className="relative z-20 mx-auto -mt-12 max-w-6xl px-6">
      <div className="flex flex-col items-stretch justify-between gap-6 rounded bg-white px-8 py-8 shadow-xl md:flex-row md:items-center">
        {displayStats.map((stat, index) => {
          const highlight = "highlight" in stat && stat.highlight;
          return (
          <div
            key={stat.label}
            className={`flex flex-1 items-center justify-center space-x-4 ${
              highlight
                ? "scale-105 rounded-lg bg-white p-6 shadow-2xl md:scale-110"
                : index < displayStats.length - 1
                  ? "border-b border-gray-100 pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-4"
                  : ""
            }`}
          >
            <StatIcon name={stat.icon} className="text-3xl text-blue-500" />
            <div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
