"use client";

import type { RefundProgressStep } from "@/lib/orders/refundDisputeData";

const DISPUTE_STEP_SHORT: Record<string, string> = {
  initiated: "Khởi tạo",
  awaiting_response: "Chờ phản hồi",
  admin_review: "Admin xem xét",
  decided: "Quyết định",
};

type DisputeProgressStepsProps = {
  steps: RefundProgressStep[];
  activeIndex: number;
};

export default function DisputeProgressSteps({ steps, activeIndex }: DisputeProgressStepsProps) {
  const allComplete = activeIndex >= steps.length;
  const progressPct =
    steps.length <= 1
      ? 0
      : Math.min(100, (Math.max(0, allComplete ? steps.length - 1 : activeIndex) / (steps.length - 1)) * 100);

  return (
    <nav className="dispute-steps" aria-label="Tiến trình xử lý tranh chấp">
      <div className="dispute-steps__rail" aria-hidden>
        <span className="dispute-steps__rail-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <ol className="dispute-steps__list">
        {steps.map((step, idx) => {
          const done = allComplete || idx < activeIndex;
          const current = !allComplete && idx === activeIndex;
          const shortLabel = DISPUTE_STEP_SHORT[step.id] ?? step.label;

          return (
            <li
              key={step.id}
              className={`dispute-steps__item${done ? " dispute-steps__item--done" : ""}${current ? " dispute-steps__item--current" : ""}`}
            >
              <span className="dispute-steps__dot" aria-hidden>
                {done ? "✓" : idx + 1}
              </span>
              <span className="dispute-steps__label" title={step.label}>
                {shortLabel}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
