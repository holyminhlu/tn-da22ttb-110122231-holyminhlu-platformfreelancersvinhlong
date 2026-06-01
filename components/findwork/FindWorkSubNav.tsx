"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/findwork", label: "Tìm việc làm", exact: true },
  { href: "/findwork/orders", label: "Đơn dịch vụ", exact: false },
] as const;

export default function FindWorkSubNav() {
  const pathname = usePathname();

  return (
    <nav className="fw-subnav" aria-label="Find work sections">
      <div className="fw-subnav__inner">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`fw-subnav__link${active ? " fw-subnav__link--active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
        <span className="fw-subnav__link opacity-60">Khách hàng tiềm năng</span>
        <span className="fw-subnav__link opacity-60">Báo giá job</span>
      </div>
    </nav>
  );
}
