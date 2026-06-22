"use client";

import type { AdminStatsTrendPoint } from "@/lib/api/adminStats";

type BarDatum = { label: string; value: number; color?: string };

const CHART_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export function formatShortDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

export function formatVndShort(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export function AdminTrendChart({
  data,
  title,
  color = "#2563eb",
  showAmount,
}: {
  data: AdminStatsTrendPoint[];
  title: string;
  color?: string;
  showAmount?: boolean;
}) {
  const values = data.map((d) => (showAmount ? d.amount ?? 0 : d.count));
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, v) => sum + v, 0);
  const peak = Math.max(0, ...values);

  const labelIndices: number[] = [];
  if (data.length > 0) {
    const step = data.length <= 6 ? 1 : Math.ceil((data.length - 1) / 5);
    for (let i = 0; i < data.length; i += step) labelIndices.push(i);
    const last = data.length - 1;
    if (labelIndices[labelIndices.length - 1] !== last) labelIndices.push(last);
  }

  const formatValue = (value: number) =>
    showAmount ? `${formatVndShort(value)} ₫` : value.toLocaleString("vi-VN");

  return (
    <div className="admin-chart admin-chart--trend">
      <div className="admin-chart__trend-head">
        <h3 className="admin-chart__title">{title}</h3>
        <p className="admin-chart__trend-meta">
          Tổng: <strong>{formatValue(total)}</strong>
          <span aria-hidden> · </span>
          Cao nhất: <strong>{formatValue(peak)}</strong>
        </p>
      </div>
      <div className="admin-chart__trend-wrap">
        <div className="admin-chart__trend-plot" role="img" aria-label={title}>
          {data.map((point) => {
            const value = showAmount ? point.amount ?? 0 : point.count;
            const heightPct = Math.max(3, (value / max) * 100);
            return (
              <div
                key={point.date}
                className="admin-chart__trend-col"
                title={`${formatShortDate(point.date)}: ${formatValue(value)}`}
              >
                <div
                  className="admin-chart__trend-bar"
                  style={{ height: `${heightPct}%`, background: color }}
                />
              </div>
            );
          })}
        </div>
        <div className="admin-chart__trend-axis" aria-hidden>
          {labelIndices.map((idx) => {
            const point = data[idx];
            if (!point) return null;
            const leftPct = data.length <= 1 ? 50 : (idx / (data.length - 1)) * 100;
            return (
              <span
                key={point.date}
                className="admin-chart__trend-axis-label"
                style={{ left: `${leftPct}%` }}
              >
                {formatShortDate(point.date)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminBarChart({
  data,
  title,
}: {
  data: BarDatum[];
  title: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="admin-chart">
      <h3 className="admin-chart__title">{title}</h3>
      <div className="admin-chart__bars">
        {data.map((item, idx) => (
          <div key={item.label} className="admin-chart__bar-row">
            <span className="admin-chart__bar-label" title={item.label}>
              {item.label}
            </span>
            <div className="admin-chart__bar-track">
              <div
                className="admin-chart__bar-fill"
                style={{
                  width: `${Math.max(4, (item.value / max) * 100)}%`,
                  background: item.color || CHART_COLORS[idx % CHART_COLORS.length],
                }}
              />
            </div>
            <span className="admin-chart__bar-value">{item.value.toLocaleString("vi-VN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  client: "Khách hàng",
  freelancer: "Freelancer",
  admin: "Admin",
};

export function AdminDonutChart({
  data,
  title,
}: {
  data: { label: string; value: number }[];
  title: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let offset = 0;
  const segments = data.map((item, idx) => {
    const pct = item.value / total;
    const dash = pct * 100;
    const segment = {
      ...item,
      dash,
      offset,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    };
    offset += dash;
    return segment;
  });

  return (
    <div className="admin-chart admin-chart--donut">
      <h3 className="admin-chart__title">{title}</h3>
      <div className="admin-chart__donut-wrap">
        <svg viewBox="0 0 42 42" className="admin-chart__donut" aria-hidden>
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="4" />
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={seg.color}
              strokeWidth="4"
              strokeDasharray={`${seg.dash} ${100 - seg.dash}`}
              strokeDashoffset={25 - seg.offset}
            />
          ))}
        </svg>
        <div className="admin-chart__donut-center">
          <strong>{total.toLocaleString("vi-VN")}</strong>
          <span>Tổng</span>
        </div>
      </div>
      <ul className="admin-chart__legend">
        {segments.map((seg) => (
          <li key={seg.label}>
            <span className="admin-chart__legend-dot" style={{ background: seg.color }} />
            {seg.label}: {seg.value.toLocaleString("vi-VN")} ({Math.round((seg.value / total) * 100)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

export function roleLabel(role: string) {
  return ROLE_LABELS[role.toLowerCase()] || role;
}
