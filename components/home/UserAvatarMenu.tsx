"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/lib/api/auth";
import { clearStoredSession, getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { isFreelancerRole } from "@/hooks/useStoredUser";
import type { StoredUser } from "@/lib/authSession";
import { useTranslation } from "@/hooks/useTranslation";
import { getUserMenuItems, type UserMenuEntry } from "./userMenuItems";

type UserAvatarMenuProps = {
  user: StoredUser;
};

export default function UserAvatarMenu({
  user }: UserAvatarMenuProps) {
  const { t } = useTranslation();

  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuItems = getUserMenuItems(user.role, t);
  const avatarSrc = resolveAvatarSrc(user.avatarUrl);
  const label = user.fullName?.trim() || user.email;

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
  const t = tUi;
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
  const t = tUi;
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenu]);

  async function handleLogout() {
  const t = tUi;
    if (loggingOut) return;
    setLoggingOut(true);
    closeMenu();

    const refreshToken =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_refresh_token") : null;

    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch {
      /* vẫn xóa phiên local nếu API lỗi */
    } finally {
      clearStoredSession();
      setLoggingOut(false);
      router.push("/dang-nhap");
      router.refresh();
    }
  }

  function onMenuItemClick(item: UserMenuEntry) {
  const t = tUi;
    if (item.type === "logout") {
      void handleLogout();
      return;
    }
    if (item.type !== "item") return;
    closeMenu();
    router.push(item.href);
  }

  return (
    <div ref={rootRef} className="home-navbar__user-menu relative">
      <button
        type="button"
        className="home-navbar__avatar-link rounded-full outline-none"
        title={label}
        aria-label={t("userMenu.accountAria", { label })}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        {isFreelancerRole(user.role) ? (
          <FreelancerAvatarFrame
            completedJobs={user.completedJobs}
            size={40}
            src={avatarSrc}
            alt={label}
            fallback={getUserInitials(user.fullName, user.email)}
          />
        ) : (
          <Avatar size="lg" className="size-10 ring-2 ring-primary/25 transition hover:ring-primary/50">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={label} /> : null}
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {getUserInitials(user.fullName, user.email)}
            </AvatarFallback>
          </Avatar>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("userMenu.menuAria")}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] min-w-[14rem] overflow-hidden rounded-md border border-border bg-card py-1 text-card-foreground shadow-lg"
        >
          {menuItems.map((item, index) => {
            if (item.type === "header") {
              return (
                <p
                  key={`header-${index}`}
                  className="px-4 pb-1 pt-2.5 text-[10px] font-bold tracking-wide text-muted-foreground"
                >
                  {item.label}
                </p>
              );
            }

            const isLogout = item.type === "logout";
            const disabled = isLogout && loggingOut;

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={disabled}
                className={`home-navbar__user-menu-item block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted ${
                  isLogout ? "border-t border-border font-medium text-primary" : ""
                }`}
                onClick={() => onMenuItemClick(item)}
              >
                {isLogout && loggingOut ? t("userMenu.loggingOut") : item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
