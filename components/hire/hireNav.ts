export const HIRE_NAV = [
  { id: "quotes", href: "/hire/quotes", labelKey: "hireNav.quotes" },
  { id: "messages", href: "/hire/messages", labelKey: "hireNav.messages", exact: true },
  { id: "orders", href: "/hire/orders", labelKey: "hireNav.orders" },
  { id: "favorites", href: "/hire/favorites", labelKey: "hireNav.favorites" },
  { id: "search", href: "/hire/search", labelKey: "hireNav.search" },
  { id: "joblist", href: "/hire/joblist", labelKey: "hireNav.joblist" },
] as const;

export type HireNavId = (typeof HIRE_NAV)[number]["id"];
