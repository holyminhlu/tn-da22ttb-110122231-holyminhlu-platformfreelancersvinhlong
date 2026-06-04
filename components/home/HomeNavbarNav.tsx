"use client";

import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";
import { ABOUT_NAV, SOLUTIONS_NAV } from "./navMenus";
import NavDropdown from "./NavDropdown";

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
  const { user, ready, isFreelancer, isClient } = useStoredUser({ refreshFromApi: false });

  if (!ready) {
    return <div className="hidden h-5 w-48 md:block" aria-hidden />;
  }

  if (user && isClient) {
    return (
      <div className="hidden space-x-6 font-medium text-gray-700 md:flex">
        {CLIENT_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-blue-600">
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  if (user && isFreelancer) {
    return (
      <div className="hidden space-x-6 font-medium text-gray-700 md:flex">
        {FREELANCER_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-blue-600">
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden space-x-6 font-medium text-gray-700 md:flex">
      <Link href="/freelancers" className="hover:text-blue-600">
        Find Freelancers
      </Link>
      <Link href="/findwork" className="hover:text-blue-600">
        Find Jobs
      </Link>
      <NavDropdown label="About" items={ABOUT_NAV} />
      <NavDropdown label="Solutions" items={SOLUTIONS_NAV} />
    </div>
  );
}
