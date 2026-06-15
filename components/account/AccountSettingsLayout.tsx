"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import EditAccountSidebar, { type AccountSidebarSection } from "./EditAccountSidebar";
import "./edit-account.css";

function resolveActiveSection(pathname: string): AccountSidebarSection {
  if (pathname.startsWith("/ho-so/phan-hoi")) return "feedback";
  if (pathname.startsWith("/ho-so/thong-ke")) return "stats";
  if (pathname.startsWith("/ho-so")) return "profile";
  if (pathname.startsWith("/edit-account/xac-minh")) return "verification";
  if (pathname.startsWith("/edit-account/ten-dang-nhap")) return "credentials";
  if (pathname.startsWith("/edit-account/bao-mat")) return "security";
  if (pathname.startsWith("/edit-account/cai-dat")) return "settings";
  if (pathname.startsWith("/edit-account")) return "contact";
  return "contact";
}

type AccountSettingsLayoutProps = {
  children: ReactNode;
};

export default function AccountSettingsLayout({ children }: AccountSettingsLayoutProps) {
  const pathname = usePathname();
  const active = resolveActiveSection(pathname);
  const isProfile = active === "profile";

  return (
    <div
      className={`home-landing edit-account-page text-gray-900${isProfile ? " my-profile-page" : ""}`}
    >
      <HomeNavbar />
      <main id="main-content">
        <div className="ea-shell">
          <aside className="ea-shell__sidebar" aria-label="Menu cài đặt tài khoản">
            <EditAccountSidebar active={active} />
          </aside>
          <div className="ea-shell__content">{children}</div>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
