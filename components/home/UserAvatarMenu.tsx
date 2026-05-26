"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/lib/api/auth";
import { clearStoredSession, getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import type { StoredUser } from "@/lib/authSession";

const MENU_ITEMS = [
  { id: "edit-account", label: "Edit Account", enabled: true, href: "/edit-account" },
  { id: "edit-profile", label: "Edit Profile", enabled: true, href: "/ho-so" },
  { id: "help", label: "Help", enabled: true, href: "/help" },
  { id: "logout", label: "Log Out", enabled: true },
] as const;

type UserAvatarMenuProps = {
  user: StoredUser;
};

export default function UserAvatarMenu({ user }: UserAvatarMenuProps) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const avatarSrc = resolveAvatarSrc(user.avatarUrl);
  const label = user.fullName?.trim() || user.email;

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
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

  function onMenuItemClick(item: (typeof MENU_ITEMS)[number]) {
    if (item.id === "logout") {
      void handleLogout();
      return;
    }
    closeMenu();
    if ("href" in item && item.href) {
      router.push(item.href);
    }
  }

  return (
    <div ref={rootRef} className="home-navbar__user-menu relative">
      <button
        type="button"
        className="home-navbar__avatar-link rounded-full outline-none"
        title={label}
        aria-label={`Tài khoản: ${label}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Avatar size="lg" className="size-10 ring-2 ring-[#0066cc]/25 transition hover:ring-[#0066cc]/50">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt={label} /> : null}
          <AvatarFallback className="bg-[#e8f1fb] text-sm font-semibold text-[#0066cc]">
            {getUserInitials(user.fullName, user.email)}
          </AvatarFallback>
        </Avatar>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] min-w-[11rem] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={!item.enabled || (item.id === "logout" && loggingOut)}
              className={`home-navbar__user-menu-item block w-full px-4 py-2.5 text-left text-sm ${
                item.enabled
                  ? "text-gray-800 hover:bg-gray-50"
                  : "cursor-default text-gray-400"
              } ${item.id === "logout" ? "border-t border-gray-100 text-[#0066cc] font-medium" : ""}`}
              onClick={() => onMenuItemClick(item)}
            >
              {item.id === "logout" && loggingOut ? "Logging out..." : item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
