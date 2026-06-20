"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { ProfileStatsViewPoint } from "@/lib/api/users";

type ProfileViewsChartProps = {
  series: ProfileStatsViewPoint[];
};

function formatAxisDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function ProfileViewsChart({ series }: ProfileViewsChartProps) {
  const { t } = useTranslation();

  const maxViews = Math.max(1, ...series.map((p) => p.views));
  const yTicks = Array.from({ length: maxViews + 1 }, (_, i) => i);

  if (series.length === 0) {
    return (
      <div className="ps-chart-wrap">
        <p className="ps-summary">Chưa có dữ liệu lượt xem.</p>
      </div>
    );
  }

  return (
    <div className="ps-chart-wrap">
      <div className="ps-chart-y" aria-hidden>
        {yTicks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="ps-chart" role="img" aria-label="Biểu đồ lượt xem hồ sơ">
        {series.map((point) => {
          const heightPct = Math.round((point.views / maxViews) * 100);
          return (
            <div key={point.date} className="ps-chart__bar-col" title={`${formatAxisDate(point.date)}: ${point.views}`}>
              <div className="ps-chart__bar" style={{ height: `${heightPct}%` }} />
              <span className="ps-chart__label">{formatAxisDate(point.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
