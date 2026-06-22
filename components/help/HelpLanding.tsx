"use client";

import { useTranslation } from "@/hooks/useTranslation";
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
  const { t } = useTranslation();

  return (
    <>
      <section className="help-hero" aria-labelledby="help-hero-title">
        <h1 id="help-hero-title" className="help-hero__title">
          {t("helpPage.heroTitle")}
        </h1>
        <p className="help-hero__subtitle">{t("helpPage.heroSubtitle")}</p>
      </section>

      <section className="help-cards" aria-label={t("helpPage.accountTypeAria")}>
        <div className="help-cards__inner">
          <AccountTypeCard
            href="/help/employer"
            label={t("helpPage.iAmClient")}
            icon={<FaUser />}
            bordered
          />
          <AccountTypeCard
            href="/help/freelancer"
            label={t("helpPage.iAmFreelancer")}
            icon={<FaLaptop />}
          />
        </div>
      </section>

      <section className="help-quick" aria-label={t("footer.navigate")}>
        <div className="help-quick__block">
          <h2 className="help-quick__title">{t("helpPage.quickFindExpert")}</h2>
          <Link href="/freelancers" className="help-quick__btn">
            {t("helpPage.quickFindFreelancer")}
          </Link>
        </div>
        <div className="help-quick__divider" aria-hidden />
        <div className="help-quick__block">
          <h2 className="help-quick__title">{t("helpPage.quickFindJob")}</h2>
          <Link href="/findwork" className="help-quick__btn">
            {t("helpPage.quickFindJobBtn")}
          </Link>
        </div>
      </section>
    </>
  );
}
