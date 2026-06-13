/** Chuyển Markdown sang văn bản thuần cho preview ngắn. */
export function markdownToPlainText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chuẩn hóa tiêu đề viết IN HOA dài thành dạng dễ đọc hơn. */
export function formatDisplayTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const letters = trimmed.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return trimmed;

  const upperLetters = trimmed.replace(/[^\p{Lu}]/gu, "");
  if (upperLetters.length / letters.length <= 0.7) return trimmed;

  const lower = trimmed.toLocaleLowerCase("vi-VN");
  return lower.charAt(0).toLocaleUpperCase("vi-VN") + lower.slice(1);
}
