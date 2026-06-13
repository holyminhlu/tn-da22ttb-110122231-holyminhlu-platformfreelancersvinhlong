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
  acb: "#0033a0",
  vpbank: "#00a651",
  sacombank: "#0054a6",
  tpbank: "#5c2d91",
};

export type BankVisual = {
  name: string;
  color: string;
  abbr: string;
};

export function maskAccountNumber(accountNumber: string, last4?: string): string {
  const digits = String(accountNumber || "").replace(/\D/g, "");
  const tail = last4 || digits.slice(-4);
  if (!tail) return "—";
  return `******${tail}`;
}

export function resolveBankBin(bankName: string): string | null {
  const label = String(bankName || "").toLowerCase().trim();
  for (const [bank, bin] of Object.entries(BANK_BINS)) {
    if (label.includes(bank)) return bin;
  }
  return null;
}

export function resolveBankVisual(bankName: string): BankVisual {
  const label = String(bankName || "").toLowerCase().trim();
  for (const [bank, color] of Object.entries(BANK_COLORS)) {
    if (label.includes(bank)) {
      return {
        name: bankName,
        color,
        abbr: bank.slice(0, 2).toUpperCase(),
      };
    }
  }
  const abbr = bankName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { name: bankName, color: "#2563eb", abbr: abbr || "NH" };
}
