"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import {
  FaBell,
  FaChild,
  FaCookieBite,
  FaDatabase,
  FaEnvelope,
  FaExchangeAlt,
  FaFileContract,
  FaGavel,
  FaGlobe,
  FaHeadset,
  FaHistory,
  FaLock,
  FaServer,
  FaShareAlt,
  FaUserShield,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import LegalRichText from "./legalRichText";
import { PRIVACY_META, PRIVACY_SECTIONS } from "./privacyData";
import type { TermsSection } from "./termsData";
import "./legal.css";

const SECTION_ICONS: Record<string, IconType> = {
  scope: FaGlobe,
  "data-collected": FaDatabase,
  purposes: FaGavel,
  "legal-basis": FaBell,
  "storage-security": FaLock,
  sharing: FaShareAlt,
  cookies: FaCookieBite,
  rights: FaUserShield,
  retention: FaHistory,
  children: FaChild,
  changes: FaExchangeAlt,
  contact: FaEnvelope,
};

function sectionIconClass(section: TermsSection): string {
  if (section.emphasis === "danger") return "legal-section__icon legal-section__icon--danger";
  if (section.emphasis === "warning") return "legal-section__icon legal-section__icon--warning";
  return "legal-section__icon";
}

function bulletIconClass(section: TermsSection): string {
  if (section.emphasis === "danger") return "legal-bullet__icon legal-bullet__icon--danger";
  if (section.emphasis === "warning") return "legal-bullet__icon legal-bullet__icon--warning";
  return "legal-bullet__icon";
}

function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="legal-hero py-14 text-white md:py-20">
      <div className="legal-container max-w-3xl text-center">
        <p className="mb-3 inline-flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-blue-300">
          <FaUserShield aria-hidden />
          {t("Pháp lý")}
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">{t(PRIVACY_META.title)}</h1>
        <p className="legal-hero__subtitle">
          <LegalRichText text={PRIVACY_META.subtitle} />
        </p>
      </div>
    </section>
  );
}

export default function PrivacyPolicyContent() {
  const { t } = useTranslation();

  return (
    <div className="legal-page bg-white text-gray-900">
      <HeroSection />

      <div className="legal-container legal-layout">
        <nav className="legal-toc" aria-label={t("Mục lục chính sách bảo mật")}>
          <p className="legal-toc__title">{t("Mục lục")}</p>
          <ol className="legal-toc__list">
            {PRIVACY_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id] ?? FaUserShield;
              return (
                <li key={section.id}>
                  <a className="legal-toc__link" href={`#${section.id}`}>
                    <Icon className="legal-toc__icon" aria-hidden />
                    <span>{t(section.title)}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <article className="legal-doc">
          <div className="legal-meta">
            <span className="legal-meta__badge">
              <FaLock aria-hidden />
              {t("Hiệu lực từ")} {PRIVACY_META.effectiveDate}
            </span>
            <span>{t("Áp dụng khi bạn sử dụng Vĩnh Long Connect")}</span>
          </div>

          {PRIVACY_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id] ?? FaUserShield;
            const BulletIcon = SECTION_ICONS[section.id] ?? FaServer;

            return (
              <section key={section.id} id={section.id} className="legal-section">
                <div className="legal-section__head">
                  <span className={sectionIconClass(section)} aria-hidden>
                    <Icon />
                  </span>
                  <h2 className="legal-section__title">{t(section.title)}</h2>
                </div>

                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>
                    <LegalRichText text={paragraph} />
                  </p>
                ))}

                {section.bullets?.length ? (
                  <ul className="legal-bullets">
                    {section.bullets.map((item) => (
                      <li key={item.slice(0, 48)}>
                        <BulletIcon className={bulletIconClass(section)} aria-hidden />
                        <span>
                          <LegalRichText text={item} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.note ? (
                  <p className="legal-note">
                    <FaLock className="legal-note__icon" aria-hidden />
                    <span>
                      <LegalRichText text={section.note} />
                    </span>
                  </p>
                ) : null}
              </section>
            );
          })}

          <div className="legal-cta">
            <p>
              <LegalRichText text="Quản lý dữ liệu và bảo mật tài khoản trực tiếp tại **Bảo mật tài khoản**. Xem thêm **Điều khoản dịch vụ** để biết quyền và nghĩa vụ khi dùng Escrow, hoàn tiền và tranh chấp." />
            </p>
            <div className="legal-cta__links">
              <Link href="/edit-account/bao-mat" className="legal-cta__link">
                <FaLock aria-hidden />
                {t("Bảo mật tài khoản")}
              </Link>
              <Link href="/dieu-khoan-dich-vu" className="legal-cta__link">
                <FaFileContract aria-hidden />
                {t("Điều khoản dịch vụ")}
              </Link>
              <Link href="/help" className="legal-cta__link">
                <FaHeadset aria-hidden />
                {t("Trung tâm trợ giúp")}
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
