export const DOMESTIC_BANKS = [
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
  "Sacombank",
  "TPBank",
] as const;

const BANK_BINS: Record<string, string> = {
  vietcombank: "970436",
  bidv: "970418",
  vietinbank: "970415",
  agribank: "970405",
  techcombank: "970407",
  "mb bank": "970422",
  acb: "970416",
  vpbank: "970432",
  sacombank: "970403",
  tpbank: "970423",
};

const BANK_COLORS: Record<string, string> = {
  vietcombank: "#00673b",
  bidv: "#006b3f",
  vietinbank: "#005baa",
  agribank: "#ae1c3f",
  techcombank: "#ed1c24",
  "mb bank": "#141ed2",
  mbbank: "#141ed2",
  acb: "#0033a0",
  vpbank: "#00a651",
  sacombank: "#0054a6",
  tpbank: "#5c2d91",
};

const BANK_LOGOS: Record<string, string> = {
  vietcombank: "/Media/Icon-Vietcombank.webp",
  bidv: "/Media/Logo_Bidv_mới.svg.png",
  vietinbank: "/Media/Logo-VietinBank-CTG-Ori.webp",
  agribank: "/Media/Icon-Agribank.png",
  techcombank: "/Media/Techcombank_logo.png",
  "mb bank": "/Media/Logo_MB_new.png",
  mbbank: "/Media/Logo_MB_new.png",
  acb: "/Media/acbbank.jpg",
  vpbank: "/Media/Icon-VPBank.webp",
  sacombank: "/Media/Logo-Sacombank-new.png",
  tpbank: "/Media/Logo_TPBank.svg.png",
};

export type BankVisual = {
  name: string;
  color: string;
  abbr: string;
  logoSrc: string | null;
};

function matchBankEntry<T>(bankName: string, table: Record<string, T>): T | null {
  const label = String(bankName || "").toLowerCase().trim();
  if (!label) return null;
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const bank of keys) {
    if (label.includes(bank)) return table[bank] ?? null;
  }
  return null;
}

export function maskAccountNumber(accountNumber: string, last4?: string): string {
  const digits = String(accountNumber || "").replace(/\D/g, "");
  const tail = last4 || digits.slice(-4);
  if (!tail) return "—";
  return `******${tail}`;
}

export function resolveBankBin(bankName: string): string | null {
  return matchBankEntry(bankName, BANK_BINS);
}

export function resolveBankLogo(bankName: string): string | null {
  return matchBankEntry(bankName, BANK_LOGOS);
}

export function resolveBankVisual(bankName: string): BankVisual {
  const label = String(bankName || "").toLowerCase().trim();
  const keys = Object.keys(BANK_COLORS).sort((a, b) => b.length - a.length);
  for (const bank of keys) {
    if (label.includes(bank)) {
      return {
        name: bankName,
        color: BANK_COLORS[bank],
        abbr: bank.replace(/\s+/g, "").slice(0, 2).toUpperCase(),
        logoSrc: BANK_LOGOS[bank] ?? null,
      };
    }
  }
  const abbr = bankName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { name: bankName, color: "#2563eb", abbr: abbr || "NH", logoSrc: null };
}
