export type ThemePreference = "light" | "dark" | "system";
export type LocalePreference = "vi" | "en";

export type NotificationPrefs = {
  orders: boolean;
  messages: boolean;
  quotes: boolean;
  emailDigest: boolean;
};

const THEME_KEY = "vlc_theme";
const LOCALE_KEY = "vlc_locale";
const NOTIF_KEY = "vlc_notification_prefs";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  orders: true,
  messages: true,
  quotes: true,
  emailDigest: false,
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getThemePreference(): ThemePreference {
  if (!canUseStorage()) return "light";
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === "dark" || raw === "system") return raw;
  return "light";
}

export function setThemePreference(theme: ThemePreference) {
  if (!canUseStorage()) return;
  localStorage.setItem(THEME_KEY, theme);
  applyThemePreference(theme);
}

export function resolveDarkMode(theme: ThemePreference): boolean {
  if (theme === "dark") return true;
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveDarkMode(theme));
}

export function getLocalePreference(): LocalePreference {
  if (!canUseStorage()) return "vi";
  return localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "vi";
}

export function setLocalePreference(locale: LocalePreference) {
  if (!canUseStorage()) return;
  localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.lang = locale;
}

export function getNotificationPrefs(): NotificationPrefs {
  if (!canUseStorage()) return { ...DEFAULT_NOTIFICATION_PREFS };
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function setNotificationPrefs(prefs: NotificationPrefs) {
  if (!canUseStorage()) return;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}

export function applyStoredUserPreferences() {
  applyThemePreference(getThemePreference());
  if (typeof document !== "undefined") {
    document.documentElement.lang = getLocalePreference();
  }
}
