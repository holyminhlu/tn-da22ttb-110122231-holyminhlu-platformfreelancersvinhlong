/** Ký tự phân tách key — VD: payment_page.balance_title */
export const I18N_KEY_SEPARATOR = "." as const;

/** Key hợp lệ: ít nhất một dấu chấm, chỉ chữ/số/_ */
export function isStructuredTranslationKey(key: string): boolean {
  return /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/i.test(key);
}
