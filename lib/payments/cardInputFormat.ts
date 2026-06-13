export type CardBrand = "visa" | "mastercard" | "jcb" | "amex" | "unknown";

const DIACRITICS: Record<string, string> = {
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  ă: "a", ằ: "a", ắ: "a", ẳ: "a", ẵ: "a", ặ: "a",
  â: "a", ầ: "a", ấ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ề: "e", ế: "e", ể: "e", ễ: "e", ệ: "e",
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ồ: "o", ố: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ờ: "o", ớ: "o", ở: "o", ỡ: "o", ợ: "o",
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ừ: "u", ứ: "u", ử: "u", ữ: "u", ự: "u",
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  đ: "d",
};

export function stripDiacritics(value: string) {
  return value
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = DIACRITICS[lower];
      if (mapped) return ch === lower ? mapped : mapped.toUpperCase();
      return ch;
    })
    .join("");
}

export function formatCardholderName(value: string) {
  return stripDiacritics(value)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trimStart()
    .slice(0, 26);
}

export function parseCardDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCardNumber(value: string) {
  const digits = parseCardDigits(value).slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^35(2[89]|[3-8]\d)/.test(digits)) return "jcb";
  return "unknown";
}

export function cardBrandLabel(brand: CardBrand) {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "jcb":
      return "JCB";
    case "amex":
      return "Amex";
    default:
      return "";
  }
}

export function formatCardExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Chuẩn hóa MM/YY từ input (hỗ trợ cả `03 / 27` của react-payment-inputs). */
export function normalizeCardExpiryInput(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 4) return null;
  const month = Number(digits.slice(0, 2));
  const yearPart = digits.slice(2, 4);
  if (month < 1 || month > 12) return null;
  return `${String(month).padStart(2, "0")}/${yearPart}`;
}

export function parseCardExpiry(value: string) {
  const normalized = normalizeCardExpiryInput(value);
  if (!normalized) return null;

  const month = Number(normalized.slice(0, 2));
  const year = 2000 + Number(normalized.slice(3, 5));
  // Hết hạn cuối tháng MM (month 1–12 → Date month index = month)
  const expiryEnd = new Date(year, month, 0, 23, 59, 59, 999);
  if (expiryEnd < new Date()) return null;
  return { month, year };
}

export function isValidCardNumber(digits: string) {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
