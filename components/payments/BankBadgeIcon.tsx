import { resolveBankVisual } from "@/lib/payments/bankDisplay";
import "./bank-badge.css";

type BankBadgeIconProps = {
  bankName: string;
  size?: number;
  className?: string;
};

export default function BankBadgeIcon({ bankName, size = 44, className = "" }: BankBadgeIconProps) {
  const visual = resolveBankVisual(bankName);

  if (visual.logoSrc) {
    return (
      <span
        className={`bank-badge-icon ${className}`.trim()}
        style={{ width: size, height: size }}
        title={visual.name}
        aria-hidden
      >
        <img src={visual.logoSrc} alt="" className="bank-badge-icon__img" />
      </span>
    );
  }

  return (
    <span
      className={`bank-badge-icon bank-badge-icon--fallback payments-method-icon payments-method-icon__badge payments-method-icon__badge--bank ${className}`.trim()}
      style={{
        width: size,
        height: size,
        backgroundColor: visual.color,
        fontSize: size * 0.32,
      }}
      title={visual.name}
      aria-hidden
    >
      {visual.abbr}
    </span>
  );
}

type BankNameWithLogoProps = {
  bankName: string;
  size?: number;
  showName?: boolean;
  suffix?: string;
  className?: string;
};

export function BankNameWithLogo({
  bankName,
  size = 22,
  showName = false,
  suffix,
  className = "",
}: BankNameWithLogoProps) {
  const visual = resolveBankVisual(bankName);
  return (
    <span className={`bank-name-with-logo ${className}`.trim()} title={visual.name}>
      <BankBadgeIcon bankName={bankName} size={size} />
      {showName ? <span className="bank-name-with-logo__text">{bankName}</span> : null}
      {suffix ? <span className="bank-name-with-logo__suffix">{suffix}</span> : null}
    </span>
  );
}
