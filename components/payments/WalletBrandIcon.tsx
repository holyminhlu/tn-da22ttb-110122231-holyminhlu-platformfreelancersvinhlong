import Image from "next/image";

export type WalletBrand = "momo" | "zalopay";

const WALLET_META: Record<WalletBrand, { src: string; alt: string; label: string }> = {
  momo: { src: "/Media/momo.png", alt: "MoMo", label: "MoMo" },
  zalopay: { src: "/Media/zalopay.png", alt: "ZaloPay", label: "ZaloPay" },
};

export function getWalletBrandKey(value: string): WalletBrand | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("momo")) return "momo";
  if (normalized.includes("zalopay") || normalized.includes("zalo pay")) return "zalopay";
  return null;
}

type WalletBrandIconProps = {
  brand: WalletBrand;
  size?: number;
  className?: string;
};

export default function WalletBrandIcon({
  brand,
  size = 28,
  className = "",
}: WalletBrandIconProps) {
  const meta = WALLET_META[brand];

  return (
    <Image
      src={meta.src}
      alt={meta.alt}
      width={size}
      height={size}
      className={["payments-wallet-icon", className].filter(Boolean).join(" ")}
    />
  );
}

export function walletBrandLabel(brand: WalletBrand) {
  return WALLET_META[brand].label;
}
