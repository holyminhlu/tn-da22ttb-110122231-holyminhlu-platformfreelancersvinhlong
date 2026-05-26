"use client";

import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";
import { ABOUT_NAV, SOLUTIONS_NAV } from "./navMenus";
import NavDropdown from "./NavDropdown";

const FREELANCER_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/findwork", label: "Find Work" },
  { href: "/jobs", label: "Jobs" },
  { href: "/payments", label: "Payments" },
] as const;

export default function HomeNavbarNav() {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });

  if (!ready) {
    return <div className="hidden h-5 w-48 md:block" aria-hidden />;
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
      <a href="#steps" className="hover:text-blue-600">
        Find Jobs
      </a>
      <NavDropdown label="About" items={ABOUT_NAV} />
      <NavDropdown label="Solutions" items={SOLUTIONS_NAV} />
    </div>
  );
}
