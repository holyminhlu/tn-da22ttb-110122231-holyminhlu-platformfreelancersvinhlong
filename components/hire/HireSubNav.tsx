"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HIRE_NAV } from "./hireNav";
import "./hire.css";

export default function HireSubNav() {
  const { t } = useTranslation();

  const pathname = usePathname();

  return (
    <nav className="hire-subnav" aria-label={t("hireNav.aria")}>
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
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
