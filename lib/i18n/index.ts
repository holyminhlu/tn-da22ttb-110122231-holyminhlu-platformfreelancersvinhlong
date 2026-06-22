/** API công khai i18n — import từ `@/lib/i18n` thay vì đường dẫn sâu. */

export { I18N_KEY_SEPARATOR, isStructuredTranslationKey } from "./config";

export type { TranslationParams } from "./types";

export { translate } from "./translate";
export {
  formatCompactVndUi,
  formatDateTimeUi,
  formatDateUi,
  formatNumUi,
  formatVndUi,
  tUi,
} from "./runtime";

export {
  formatCompactVndLocale,
  formatDateLocale,
  formatDateTimeLocale,
  formatNumber,
  formatVndLocale,
} from "./format";

export { keyedMessages } from "./messages/keyed";
