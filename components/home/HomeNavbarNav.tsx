"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoredUser } from "@/hooks/useStoredUser";
import { ABOUT_NAV } from "./navMenus";
import NavDropdown from "./NavDropdown";

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const FREELANCER_NAV = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/findwork", label: "Tìm việc" },
  { href: "/dich-vu", label: "Dịch vụ" },
  { href: "/payments", label: "Thanh toán" },
] as const;

const CLIENT_NAV = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/hire/quotes", label: "Thuê việc" },
  { href: "/manage", label: "Quản lý" },
  { href: "/payments", label: "Thanh toán" },
] as const;

export default function HomeNavbarNav() {
  const pathname = usePathname();
  const { user, ready, isFreelancer, isClient, isAdmin } = useStoredUser({ refreshFromApi: false });

  if (!ready) {
    return <div className="hidden h-5 w-48 md:block" aria-hidden />;
  }

  if (user && isAdmin) {
    const adminHref = "/admin/duyet-tai-khoan";
    const active = isNavActive(pathname, adminHref);
    return (
      <div className="hidden space-x-6 font-medium text-gray-700 md:flex">
        <Link
          href={adminHref}
          className={`home-navbar__nav-link${active ? " home-navbar__nav-link--active" : ""}`}
          aria-current={active ? "page" : undefined}
        >
          Quản trị
        </Link>
      </div>
    );
  }

  if (user && isClient) {
    return (
      <div className="hidden space-x-6 font-medium text-gray-700 md:flex">
        {CLIENT_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`home-navbar__nav-link${active ? " home-navbar__nav-link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  if (user && isFreelancer) {
    return (
      <div className="hidden space-x-6 font-medium text-gray-700 md:flex">
        {FREELANCER_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`home-navbar__nav-link${active ? " home-navbar__nav-link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="hidden space-x-6 font-medium text-gray-700 md:flex">
      <Link href="/freelancers" className="hover:text-blue-600">
        Tìm Freelancer
      </Link>
      <Link href="/findwork" className="hover:text-blue-600">
        Tìm việc
      </Link>
      <NavDropdown label="Giới thiệu" items={ABOUT_NAV} />
    </div>
  );
}
