"use client";

import { formatDeadlineCountdown } from "@/lib/orders/workflowSlaDisplay";

type WorkflowDeadlineBannerProps = {
  deadlineAt: string | null | undefined;
  label: string;
  variant?: "info" | "warn";
};

export default function WorkflowDeadlineBanner({
  deadlineAt,
  label,
  variant = "info",
}: WorkflowDeadlineBannerProps) {
  const countdown = formatDeadlineCountdown(deadlineAt);
  if (!countdown || !deadlineAt) return null;

  return (
    <div
      className={`hire-sla-banner hire-sla-banner--${variant}`}
      role="status"
    >
      <strong>{label}</strong>
      <span>{countdown}</span>
    </div>
  );
}
