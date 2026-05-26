import Link from "next/link";

const TABS = [
  { href: "/findwork", label: "Tìm việc làm", active: true },
  { href: "#", label: "Khách hàng tiềm năng", active: false },
  { href: "#", label: "Trích dẫn", active: false },
  { href: "#", label: "Danh sách việc làm tự do", active: false },
  { href: "#", label: "Những người chủ của tôi", active: false },
] as const;

export default function FindWorkSubNav() {
  return (
    <nav className="fw-subnav" aria-label="Find work sections">
      <div className="fw-subnav__inner">
        {TABS.map((tab) =>
          tab.active ? (
            <Link key={tab.label} href={tab.href} className="fw-subnav__link fw-subnav__link--active">
              {tab.label}
            </Link>
          ) : (
            <span key={tab.label} className="fw-subnav__link opacity-60">
              {tab.label}
            </span>
          ),
        )}
      </div>
    </nav>
  );
}
