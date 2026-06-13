"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HIRE_NAV } from "./hireNav";
import "./hire.css";

export default function HireSubNav() {
  const pathname = usePathname();

  return (
    <nav className="hire-subnav" aria-label="Thuê freelancer">
      <div className="hire-subnav__inner">
        {HIRE_NAV.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
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
