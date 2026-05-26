import type { ReactNode } from "react";
import Link from "next/link";
import { FaChevronRight, FaLaptop, FaUser } from "react-icons/fa";
import "./help.css";

function AccountTypeCard({
  href,
  label,
  icon,
  bordered,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  bordered?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`help-account-card${bordered ? " help-account-card--bordered" : ""}`}
    >
      <div className="help-account-card__left">
        <div className="help-account-card__icon" aria-hidden>
          {icon}
        </div>
        <span className="help-account-card__label">{label}</span>
      </div>
      <FaChevronRight className="help-account-card__chevron" aria-hidden />
    </Link>
  );
}

export default function HelpLanding() {
  return (
    <>
      <section className="help-hero" aria-labelledby="help-hero-title">
        <h1 id="help-hero-title" className="help-hero__title">
          Chúng tôi có thể giúp gì cho bạn?
        </h1>
        <p className="help-hero__subtitle">Chọn loại tài khoản</p>
      </section>

      <section className="help-cards" aria-label="Loại tài khoản">
        <div className="help-cards__inner">
          <AccountTypeCard
            href="/help/employer"
            label="Tôi là Nhà tuyển dụng"
            icon={<FaUser />}
            bordered
          />
          <AccountTypeCard
            href="/help/freelancer"
            label="Tôi là Freelancer"
            icon={<FaLaptop />}
          />
        </div>
      </section>

      <section className="help-quick" aria-label="Liên kết nhanh">
        <div className="help-quick__block">
          <h2 className="help-quick__title">Tìm chuyên gia có kỹ năng cụ thể?</h2>
          <Link href="/freelancers" className="help-quick__btn">
            Tìm Freelancer ngay
          </Link>
        </div>
        <div className="help-quick__divider" aria-hidden />
        <div className="help-quick__block">
          <h2 className="help-quick__title">Tìm việc phù hợp với kỹ năng của bạn?</h2>
          <Link href="/findwork" className="help-quick__btn">
            Tìm việc ngay
          </Link>
        </div>
      </section>
    </>
  );
}
