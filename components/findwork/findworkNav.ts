export const FINDWORK_NAV = [
  { id: "find", href: "/findwork", labelKey: "findworkNav.find", exact: true },
  { id: "saved", href: "/findwork/saved", labelKey: "findworkNav.saved", exact: true },
  { id: "jobs", href: "/jobs", labelKey: "findworkNav.jobs", exact: true },
  { id: "messages", href: "/findwork/messages", labelKey: "findworkNav.messages", exact: true },
  { id: "leads", href: "/findwork/leads", labelKey: "findworkNav.leads", exact: true },
  { id: "quotes", href: "/findwork/quotes", labelKey: "findworkNav.quotes", exact: true },
] as const;

export type FindworkNavId = (typeof FINDWORK_NAV)[number]["id"];
