"use client";

import type { ProfileStatsPeriod } from "@/lib/api/users";

const OPTIONS: { value: ProfileStatsPeriod; label: string }[] = [
  { value: "30d", label: "30 ngày qua" },
  { value: "last_year", label: "Năm ngoái" },
  { value: "all", label: "Mọi thời đại" },
];

type StatsPeriodSelectProps = {
  value: ProfileStatsPeriod;
  onChange: (value: ProfileStatsPeriod) => void;
  ariaLabel?: string;
};

export default function StatsPeriodSelect({ value, onChange, ariaLabel }: StatsPeriodSelectProps) {
  return (
    <div className="ps-period" role="group" aria-label={ariaLabel ?? "Chọn khoảng thời gian"}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`ps-period__btn${value === opt.value ? " ps-period__btn--active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
