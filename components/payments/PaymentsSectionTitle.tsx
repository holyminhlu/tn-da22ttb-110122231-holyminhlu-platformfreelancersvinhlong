import type { ReactNode } from "react";

type PaymentsSectionTitleProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function PaymentsSectionTitle({
  icon,
  children,
  className = "",
}: PaymentsSectionTitleProps) {
  return (
    <h2
      className={[
        "payments-panel__title",
        "payments-section-title",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="payments-section-title__icon" aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </h2>
  );
}
