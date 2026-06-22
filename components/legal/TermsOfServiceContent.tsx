"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import {
  FaBan,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaExclamationTriangle,
  FaFileContract,
  FaFileSignature,
  FaGavel,
  FaHeadset,
  FaIdCard,
  FaLock,
  FaShieldAlt,
  FaUndoAlt,
  FaUserLock,
  FaUsers,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import LegalRichText from "./legalRichText";
import { TERMS_META, TERMS_SECTIONS, type TermsSection } from "./termsData";
import "./legal.css";

const SECTION_ICONS: Record<string, IconType> = {
  acceptance: FaCheckCircle,
  roles: FaUsers,
  identity: FaIdCard,
  contracts: FaFileSignature,
  escrow: FaShieldAlt,
  sla: FaClock,
  "cancel-refund": FaUndoAlt,
  disputes: FaGavel,
  payments: FaCreditCard,
  conduct: FaBan,
  "account-lifecycle": FaUserLock,
  liability: FaExclamationTriangle,
  support: FaHeadset,
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
          <FaFileContract aria-hidden />
          {t("Pháp lý")}
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">{t(TERMS_META.title)}</h1>
        <p className="legal-hero__subtitle">
          <LegalRichText text={TERMS_META.subtitle} />
        </p>
      </div>
    </section>
  );
}

export default function TermsOfServiceContent() {
  const { t } = useTranslation();

  return (
    <div className="legal-page bg-white text-gray-900">
      <HeroSection />

      <div className="legal-container legal-layout">
        <nav className="legal-toc" aria-label={t("Mục lục điều khoản")}>
          <p className="legal-toc__title">{t("Mục lục")}</p>
          <ol className="legal-toc__list">
            {TERMS_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id] ?? FaFileContract;
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
              <FaCheckCircle aria-hidden />
              {t("Hiệu lực từ")} {TERMS_META.effectiveDate}
            </span>
            <span>{t("Áp dụng cho mọi người dùng Vĩnh Long Connect")}</span>
          </div>

          {TERMS_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id] ?? FaFileContract;
            const BulletIcon = SECTION_ICONS[section.id] ?? FaCheckCircle;

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
                    <FaExclamationTriangle className="legal-note__icon" aria-hidden />
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
              <LegalRichText text="Điều khoản này được xây dựng dựa trên quy trình **Escrow**, **SLA hợp đồng**, **hoàn tiền** và **tranh chấp** đang vận hành trên nền tảng. Chi tiết thao tác xem thêm tại Trợ giúp và Cách VLC hoạt động." />
            </p>
            <div className="legal-cta__links">
              <Link href="/chinh-sach-bao-mat" className="legal-cta__link">
                <FaLock aria-hidden />
                {t("Chính sách bảo mật")}
              </Link>
              <Link href="/help" className="legal-cta__link">
                <FaHeadset aria-hidden />
                {t("Trung tâm trợ giúp")}
              </Link>
              <Link href="/how-vlc-works" className="legal-cta__link">
                <FaFileSignature aria-hidden />
                {t("Cách VLC hoạt động")}
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
