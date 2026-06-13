import { resolveBankVisual } from "@/lib/payments/bankDisplay";

type BankBadgeIconProps = {
  bankName: string;
  size?: number;
  className?: string;
};

export default function BankBadgeIcon({ bankName, size = 44, className = "" }: BankBadgeIconProps) {
  const visual = resolveBankVisual(bankName);
  return (
    <span
      className={`payments-method-icon payments-method-icon__badge payments-method-icon__badge--bank ${className}`.trim()}
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
