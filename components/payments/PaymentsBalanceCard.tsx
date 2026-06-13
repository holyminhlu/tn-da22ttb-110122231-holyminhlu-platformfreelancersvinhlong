import type { IconType } from "react-icons";
import {
  FaClock,
  FaLock,
  FaMoneyBillWave,
  FaQuestionCircle,
  FaWallet,
} from "react-icons/fa";

export type PaymentsBalanceVariant = "available" | "pending" | "earned" | "escrow";

const VARIANT_META: Record<
  PaymentsBalanceVariant,
  { icon: IconType; accentClass: string }
> = {
  available: { icon: FaWallet, accentClass: "payments-balance-card--available" },
  pending: { icon: FaClock, accentClass: "payments-balance-card--pending" },
  earned: { icon: FaMoneyBillWave, accentClass: "payments-balance-card--earned" },
  escrow: { icon: FaLock, accentClass: "payments-balance-card--escrow" },
};

type PaymentsBalanceCardProps = {
  variant: PaymentsBalanceVariant;
  label: string;
  amount: string;
  hint: string;
  featured?: boolean;
  tooltip?: string;
};

export default function PaymentsBalanceCard({
  variant,
  label,
  amount,
  hint,
  featured = false,
  tooltip,
}: PaymentsBalanceCardProps) {
  const { icon: Icon, accentClass } = VARIANT_META[variant];

  return (
    <article
      className={[
        "payments-balance-card",
        accentClass,
        featured ? "payments-balance-card--featured" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="payments-balance-card__icon-wrap" aria-hidden>
        <Icon className="payments-balance-card__icon" />
      </div>
      <div className="payments-balance-card__body">
        <p className="payments-balance-card__label">
          {label}
          {tooltip ? (
            <span className="payments-balance-card__help-wrap">
              <button
                type="button"
                className="payments-balance-card__help"
                aria-label={tooltip}
                aria-describedby={undefined}
              >
                <FaQuestionCircle aria-hidden />
              </button>
              <span className="payments-balance-card__tooltip" role="tooltip">
                {tooltip}
              </span>
            </span>
          ) : null}
        </p>
        <p className="payments-balance-card__amount">{amount}</p>
        <p className="payments-balance-card__hint">{hint}</p>
      </div>
    </article>
  );
}
