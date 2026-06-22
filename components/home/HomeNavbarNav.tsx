"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useStoredUser } from "@/hooks/useStoredUser";
import { ABOUT_NAV } from "./navMenus";
import NavDropdown from "./NavDropdown";

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const FREELANCER_NAV = [
  { href: "/dashboard", labelKey: "nav.overview" },
  { href: "/findwork", labelKey: "nav.findWork" },
  { href: "/dich-vu", labelKey: "nav.services" },
  { href: "/payments", labelKey: "nav.payments" },
] as const;

const CLIENT_NAV = [
  { href: "/dashboard", labelKey: "nav.overview" },
  { href: "/hire/quotes", labelKey: "nav.hire" },
  { href: "/manage", labelKey: "nav.manage" },
  { href: "/payments", labelKey: "nav.payments" },
] as const;

export default function HomeNavbarNav() {
  const { t } = useTranslation();

  const pathname = usePathname();
  const { user, ready, isFreelancer, isClient, isAdmin } = useStoredUser({ refreshFromApi: false });

  if (!ready) {
    return <div className="hidden h-5 w-48 md:block" aria-hidden />;
  }

  if (user && isAdmin) {
    const adminHref = "/admin/duyet-tai-khoan";
    const active = isNavActive(pathname, adminHref);
    return (
      <div className="hidden space-x-6 font-medium text-muted-foreground md:flex">
        <Link
          href={adminHref}
          className={`home-navbar__nav-link${active ? " home-navbar__nav-link--active" : ""}`}
          aria-current={active ? "page" : undefined}
        >
          {t("nav.admin")}
        </Link>
      </div>
    );
  }

  if (user && isClient) {
    return (
      <div className="hidden space-x-6 font-medium text-muted-foreground md:flex">
        {CLIENT_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`home-navbar__nav-link${active ? " home-navbar__nav-link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    );
  }

  if (user && isFreelancer) {
    return (
      <div className="hidden space-x-6 font-medium text-muted-foreground md:flex">
        {FREELANCER_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`home-navbar__nav-link${active ? " home-navbar__nav-link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    );
  }

  const aboutItems = ABOUT_NAV.map((item) => ({
    href: item.href,
    label: t(item.labelKey),
  }));

  return (
    <div className="hidden space-x-6 font-medium text-muted-foreground md:flex">
      <Link href="/freelancers" className="hover:text-primary">
        {t("nav.findFreelancer")}
      </Link>
      <Link href="/findwork" className="hover:text-primary">
        {t("nav.findWork")}
      </Link>
      <NavDropdown label={t("nav.about")} items={aboutItems} />
    </div>
  );
}
