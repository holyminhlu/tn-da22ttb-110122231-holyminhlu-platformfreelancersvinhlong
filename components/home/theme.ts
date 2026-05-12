export const HOME_A11Y = {
  textPrimary: "text-zinc-900",
  textSecondary: "text-zinc-700",
  textMuted: "text-zinc-600",
  textOnDark: "text-white",
  textOnDarkMuted: "text-white/85",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2",
  linkOnLight:
    "text-brand-navy underline-offset-2 transition-colors hover:text-emerald-800 hover:underline",
  linkOnDark:
    "font-medium text-white underline underline-offset-2 transition-colors hover:text-brand-green",
  softHoverOnLight: "transition-colors hover:bg-brand-green/10 hover:text-brand-navy",
  primaryButton:
    "bg-zinc-900 text-white transition-all duration-300 hover:bg-zinc-700 active:scale-[0.98]",
  outlineButton:
    "border-2 border-emerald-700 bg-transparent text-emerald-800 transition-all duration-300 hover:bg-emerald-700 hover:text-white active:scale-[0.98]",
} as const;

export const HOME_CONTRAST_HEX = {
  white: "#FFFFFF",
  zinc900: "#18181B",
  zinc700: "#3F3F46",
  zinc600: "#52525B",
  brandNavy: "#002D5E",
  brandGreen: "#108A43",
} as const;
