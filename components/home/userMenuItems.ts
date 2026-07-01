import { isAdminRole, isClientRole } from "@/hooks/useStoredUser";
import { ADMIN_HOME } from "@/lib/auth/roleRoutes";

export type UserMenuEntry =
  | { type: "item"; id: string; label: string; href: string }
  | { type: "header"; label: string }
  | { type: "logout"; id: string; label: string };

type UserMenuTemplate =
  | { type: "item"; id: string; labelKey: string; href: string }
  | { type: "header"; labelKey: string }
  | { type: "logout"; id: string; labelKey: string };

const FREELANCER_MENU: UserMenuTemplate[] = [
  { type: "item", id: "edit-account", labelKey: "userMenu.editAccount", href: "/edit-account" },
  { type: "item", id: "edit-profile", labelKey: "userMenu.editProfile", href: "/ho-so" },
  { type: "item", id: "help", labelKey: "userMenu.help", href: "/help" },
  { type: "logout", id: "logout", labelKey: "userMenu.logout" },
];

const CLIENT_MENU: UserMenuTemplate[] = [
  { type: "item", id: "edit-account", labelKey: "userMenu.editAccount", href: "/edit-account" },
  { type: "item", id: "edit-profile", labelKey: "userMenu.editProfile", href: "/ho-so" },
  { type: "header", labelKey: "userMenu.cashAccountHeader" },
  { type: "item", id: "cash-account", labelKey: "userMenu.viewCashAccount", href: "/payments" },
  { type: "item", id: "help", labelKey: "userMenu.help", href: "/help" },
  { type: "logout", id: "logout", labelKey: "userMenu.logout" },
];

const ADMIN_MENU: UserMenuTemplate[] = [
  { type: "item", id: "admin", labelKey: "userMenu.adminDashboard", href: ADMIN_HOME },
  { type: "logout", id: "logout", labelKey: "userMenu.logout" },
];

function translateMenu(template: UserMenuTemplate[], t: (text: string) => string): UserMenuEntry[] {
  return template.map((entry) => {
    if (entry.type === "item") {
      return { type: "item", id: entry.id, label: t(entry.labelKey), href: entry.href };
    }
    if (entry.type === "header") {
      return { type: "header", label: t(entry.labelKey) };
    }
    return { type: "logout", id: entry.id, label: t(entry.labelKey) };
  });
}

export function getUserMenuItems(
  role?: string | null,
  t: (text: string) => string = (text) => text,
): UserMenuEntry[] {
  if (isAdminRole(role)) return translateMenu(ADMIN_MENU, t);
  return translateMenu(isClientRole(role) ? CLIENT_MENU : FREELANCER_MENU, t);
}
