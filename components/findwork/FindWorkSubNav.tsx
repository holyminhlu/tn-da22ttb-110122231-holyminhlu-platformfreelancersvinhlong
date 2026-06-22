"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoredUser } from "@/hooks/useStoredUser";
import { FINDWORK_NAV } from "./findworkNav";

export default function FindWorkSubNav() {
  const { t } = useTranslation();

  const pathname = usePathname();
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const tabs = (isGuest
    ? FINDWORK_NAV.filter((tab) => tab.id === "find")
    : FINDWORK_NAV.filter((tab) => tab.id !== "saved" || isFreelancer)
  );

  return (
    <nav className="hire-subnav" aria-label={t("findworkNav.aria")}>
      <div className="hire-subnav__inner">
        {tabs.map((tab) => {
          if ("disabled" in tab && tab.disabled) {
            return (
              <span
                key={tab.id}
                className="hire-subnav__link hire-subnav__link--disabled"
                aria-disabled="true"
              >
                {t(tab.labelKey)}
              </span>
            );
          }

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
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
