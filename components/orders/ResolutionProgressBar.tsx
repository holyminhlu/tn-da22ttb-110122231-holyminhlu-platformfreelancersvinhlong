"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { RefundProgressStep } from "@/lib/orders/refundDisputeData";

type ResolutionProgressBarProps = {
  steps: RefundProgressStep[];
  activeIndex: number;
  failed?: boolean;
  failedLabel?: string;
};

export default function ResolutionProgressBar({
  steps,
  activeIndex,
  failed = false,
  failedLabel,
}: ResolutionProgressBarProps) {
  const { t } = useTranslation();

  const allComplete = !failed && activeIndex >= steps.length;

  return (
    <ol
      className={`resolution-progress${failed ? " resolution-progress--failed" : ""}${allComplete ? " resolution-progress--complete" : ""}`}
      aria-label={t("Tiến trình xử lý")}
    >
      {steps.map((step, idx) => {
        const done = !failed && (allComplete || idx < activeIndex);
        const current = !failed && !allComplete && idx === activeIndex;
        const failedStep = failed && idx === activeIndex;

        return (
          <li
            key={step.id}
            className={`resolution-progress__step${done ? " resolution-progress__step--done" : ""}${current ? " resolution-progress__step--current" : ""}${failedStep ? " resolution-progress__step--failed" : ""}`}
          >
            <div className="resolution-progress__track" aria-hidden>
              {idx > 0 ? <span className="resolution-progress__line resolution-progress__line--before" /> : null}
              <span className="resolution-progress__marker">
                {done ? "✓" : idx + 1}
              </span>
              {idx < steps.length - 1 ? (
                <span className="resolution-progress__line resolution-progress__line--after" />
              ) : null}
            </div>
            <span className="resolution-progress__label">
              {failedStep && failedLabel ? failedLabel : step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
