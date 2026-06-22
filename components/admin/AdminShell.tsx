"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FaAddressBook, FaChartBar, FaGavel, FaMoneyCheckAlt, FaSignOutAlt, FaUndoAlt, FaUserCheck, FaUsers } from "react-icons/fa";
import { logout } from "@/lib/api/auth";
import { clearStoredSession, getUserInitials } from "@/lib/authSession";
import { ADMIN_HOME } from "@/lib/auth/roleRoutes";
import { ROUTES } from "@/lib/routes/paths";
import { useStoredUser } from "@/hooks/useStoredUser";
import "./admin.css";

type NavItem = {
  href: string;
  label: string;
  icon: typeof FaUserCheck;
};

type NavGroup = {
  groupKey:
    | "adminSidebar.reports"
    | "adminSidebar.users"
    | "adminSidebar.finance"
    | "adminSidebar.support"
    | "adminSidebar.system";
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: "adminSidebar.reports",
    items: [{ href: ROUTES.admin.reports, label: "Báo cáo thống kê", icon: FaChartBar }],
  },
  {
    groupKey: "adminSidebar.users",
    items: [
      { href: ROUTES.admin.accounts, label: "Quản lý tài khoản", icon: FaUsers },
      { href: ADMIN_HOME, label: "Duyệt tài khoản", icon: FaUserCheck },
    ],
  },
  {
    groupKey: "adminSidebar.finance",
    items: [
      { href: "/admin/rut-tien", label: "Rút tiền Freelancer", icon: FaMoneyCheckAlt },
      { href: "/admin/rut-tien-client", label: "Rút tiền Khách hàng", icon: FaMoneyCheckAlt },
    ],
  },
  {
    groupKey: "adminSidebar.support",
    items: [
      { href: "/admin/hoan-tien", label: "Quản lý hoàn tiền", icon: FaUndoAlt },
      { href: "/admin/tranh-chap", label: "Quản lý tranh chấp", icon: FaGavel },
    ],
  },
  {
    groupKey: "adminSidebar.system",
    items: [{ href: ROUTES.admin.contact, label: "Quản lý liên hệ", icon: FaAddressBook }],
  },
];

export default function AdminShell({
  children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, isAdmin } = useStoredUser();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/dang-nhap?next=${encodeURIComponent(ADMIN_HOME)}`);
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [ready, user, isAdmin, router]);

  async function handleLogout() {
    const refreshToken =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_refresh_token") : null;
    try {
      if (refreshToken) await logout(refreshToken);
    } catch {
      /* ignore */
    }
    clearStoredSession();
    router.push("/dang-nhap");
    router.refresh();
  }

  if (!ready || !user || !isAdmin) {
    return (
      <div className="admin-loading">
        <p>{t("Đang tải bảng quản trị…")}</p>
      </div>
    );
  }

  const label = user.fullName?.trim() || user.email;

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Link href={ROUTES.admin.reports} className="admin-sidebar__logo">
            VLC Admin
          </Link>
          <p className="admin-sidebar__subtitle">{t("Quản trị hệ thống")}</p>
        </div>
        <nav className="admin-sidebar__nav" aria-label={t("Menu quản trị")}>
          {NAV_GROUPS.map((group) => (
            <div key={group.groupKey} className="admin-sidebar__section">
              <p className="admin-sidebar__group">{t(group.groupKey)}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-sidebar__link${active ? " admin-sidebar__link--active" : ""}`}
                  >
                    <Icon aria-hidden />
                    {t(item.label)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar__foot">
          <div className="admin-sidebar__user" title={label}>
            <span className="admin-sidebar__avatar">{getUserInitials(user.fullName, user.email)}</span>
            <span className="admin-sidebar__email">{user.email}</span>
          </div>
          <button type="button" className="admin-sidebar__logout" onClick={() => void handleLogout()}>
            <FaSignOutAlt aria-hidden /> {t("Đăng xuất")}
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
