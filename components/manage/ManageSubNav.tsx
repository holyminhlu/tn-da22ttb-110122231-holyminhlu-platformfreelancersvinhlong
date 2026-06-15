"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MANAGE_NAV } from "./manageNav";
import "@/components/hire/hire.css";

export default function ManageSubNav() {
  const pathname = usePathname();

  return (
    <nav className="hire-subnav manage-subnav" aria-label="Quản lý">
      <div className="hire-subnav__inner">
        {MANAGE_NAV.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`hire-subnav__link${active ? " hire-subnav__link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
