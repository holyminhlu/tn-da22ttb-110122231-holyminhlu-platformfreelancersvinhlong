import type { BillingMethod } from "@/lib/api/payments";
import WalletBrandIcon, { getWalletBrandKey } from "@/components/payments/WalletBrandIcon";
import {
  FaCcAmex,
  FaCcJcb,
  FaCcMastercard,
  FaCcPaypal,
  FaCcVisa,
  FaUniversity,
} from "react-icons/fa";

const BANK_COLORS: Record<string, string> = {
  vietcombank: "#00673b",
  bidv: "#006b3f",
  vietinbank: "#005baa",
  agribank: "#ae1c3f",
  techcombank: "#ed1c24",
  "mb bank": "#141ed2",
  acb: "#0033a0",
  vpbank: "#00a651",
  sacombank: "#0054a6",
  tpbank: "#5c2d91",
};

function normalizeKey(value: string) {
  return value.toLowerCase().trim();
}

export function resolvePaymentMethodVisual(method: BillingMethod) {
  const label = normalizeKey(method.label);
  const wallet = getWalletBrandKey(method.label);
  if (wallet) return { kind: "wallet" as const, wallet };

  if (label.includes("visa")) return { kind: "card" as const, brand: "visa" as const };
  if (label.includes("mastercard")) return { kind: "card" as const, brand: "mastercard" as const };
  if (label.includes("amex") || label.includes("american express")) {
    return { kind: "card" as const, brand: "amex" as const };
  }
  if (label.includes("jcb")) return { kind: "card" as const, brand: "jcb" as const };

  if (method.type === "paypal" || label.includes("paypal")) {
    return { kind: "paypal" as const };
  }

  for (const [bank, color] of Object.entries(BANK_COLORS)) {
    if (label.includes(bank)) {
      return { kind: "bank" as const, name: method.label, color, abbr: bank.slice(0, 2).toUpperCase() };
    }
  }

  if (method.type === "bank") {
    const abbr = method.label
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return { kind: "bank" as const, name: method.label, color: "#2563eb", abbr: abbr || "NH" };
  }

  if (method.type === "card") {
    return { kind: "card" as const, brand: "generic" as const };
  }

  return { kind: "generic" as const };
}

type PaymentMethodIconProps = {
  method: BillingMethod;
  size?: number;
  className?: string;
};

export default function PaymentMethodIcon({
  method,
  size = 36,
  className = "",
}: PaymentMethodIconProps) {
  const visual = resolvePaymentMethodVisual(method);
  const iconClass = ["payments-method-icon", className].filter(Boolean).join(" ");

  if (visual.kind === "wallet") {
    return (
      <WalletBrandIcon brand={visual.wallet} size={size} className={iconClass} />
    );
  }

  if (visual.kind === "card") {
    const iconSize = Math.round(size * 0.72);
    switch (visual.brand) {
      case "visa":
        return <FaCcVisa className={iconClass} size={iconSize} color="#1a1f71" aria-hidden />;
      case "mastercard":
        return <FaCcMastercard className={iconClass} size={iconSize} color="#eb001b" aria-hidden />;
      case "amex":
        return <FaCcAmex className={iconClass} size={iconSize} color="#006fcf" aria-hidden />;
      case "jcb":
        return <FaCcJcb className={iconClass} size={iconSize} color="#0b4ea2" aria-hidden />;
      default:
        return (
          <span
            className={`${iconClass} payments-method-icon__badge`}
            style={{ width: size, height: size, fontSize: size * 0.38 }}
            aria-hidden
          >
            <FaUniversity />
          </span>
        );
    }
  }

  if (visual.kind === "paypal") {
    return (
      <FaCcPaypal
        className={iconClass}
        size={Math.round(size * 0.72)}
        color="#003087"
        aria-hidden
      />
    );
  }

  if (visual.kind === "bank") {
    return (
      <span
        className={`${iconClass} payments-method-icon__badge payments-method-icon__badge--bank`}
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

  return (
    <span
      className={`${iconClass} payments-method-icon__badge`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      <FaUniversity />
    </span>
  );
}
