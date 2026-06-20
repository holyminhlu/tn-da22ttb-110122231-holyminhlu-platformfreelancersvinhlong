"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FaGavel, FaMoneyCheckAlt, FaSignOutAlt, FaUndoAlt, FaUserCheck } from "react-icons/fa";
import { logout } from "@/lib/api/auth";
import { clearStoredSession, getUserInitials } from "@/lib/authSession";
import { ADMIN_HOME } from "@/lib/auth/roleRoutes";
import { useStoredUser } from "@/hooks/useStoredUser";
import "./admin.css";

const NAV = [
  { href: ADMIN_HOME, label: "Duyệt tài khoản", icon: FaUserCheck },
  { href: "/admin/hoan-tien", label: "Quản lý hoàn tiền", icon: FaUndoAlt },
  { href: "/admin/rut-tien", label: "Rút tiền Freelancer", icon: FaMoneyCheckAlt },
  { href: "/admin/rut-tien-client", label: "Rút tiền Client", icon: FaMoneyCheckAlt },
  { href: "/admin/tranh-chap", label: "Quản lý tranh chấp", icon: FaGavel },
] as const;

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

  const t = tUi;
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
          <Link href={ADMIN_HOME} className="admin-sidebar__logo">
            VLC Admin
          </Link>
          <p className="admin-sidebar__subtitle">{t("Quản trị hệ thống")}</p>
        </div>
        <nav className="admin-sidebar__nav" aria-label={t("Menu quản trị")}>
          {NAV.map((item) => {
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
