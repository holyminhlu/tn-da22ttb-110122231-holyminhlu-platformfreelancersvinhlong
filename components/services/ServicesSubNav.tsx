"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SERVICES_NAV } from "./servicesNav";

export default function ServicesSubNav() {
  const pathname = usePathname();

  return (
    <nav className="hire-subnav svc-subnav" aria-label="Dịch vụ">
      <div className="hire-subnav__inner">
        {SERVICES_NAV.map((tab) => {
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
