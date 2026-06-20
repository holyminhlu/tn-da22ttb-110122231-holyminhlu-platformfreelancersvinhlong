"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getServicesNav } from "./servicesNav";

export default function ServicesSubNav() {
  const { t } = useTranslation();

  const pathname = usePathname();
  const nav = getServicesNav(t);

  return (
    <nav className="hire-subnav svc-subnav" aria-label={t("Dịch vụ")}>
      <div className="hire-subnav__inner">
        {nav.map((tab) => {
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
              {t(tab.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
