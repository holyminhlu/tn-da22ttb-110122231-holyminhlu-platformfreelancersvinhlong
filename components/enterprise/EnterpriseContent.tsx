"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  FaChartBar,
  FaCheckCircle,
  FaCode,
  FaFileInvoiceDollar,
  FaHeadset,
  FaShieldAlt,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";
import {
  ADVANCED_FEATURES,
  CASE_STUDIES,
  COMPANY_SIZE_OPTIONS,
  CORE_BENEFITS,
  DEDICATED_SUPPORT,
  ENTERPRISE_HERO,
  PARTNER_LOGOS,
} from "./enterpriseData";
import "./enterprise.css";

const BENEFIT_ICONS = {
  talent: FaUsers,
  compliance: FaShieldAlt,
  billing: FaFileInvoiceDollar,
} as const;

const FEATURE_ICONS = {
  seats: FaUserFriends,
  dashboard: FaChartBar,
  api: FaCode,
} as const;

function SectionHeading({ title, subtitle, light }: { title: string; subtitle?: string; light?: boolean }) {
  return (
    <div className="mb-12 text-center">
      <h2
        className={`enterprise-section-title text-2xl font-bold md:text-3xl ${
          light ? "text-white" : "text-[#1c2e4a]"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={`mx-auto mt-4 max-w-2xl ${light ? "text-neutral-300" : "text-gray-600"}`}>{subtitle}</p>
      ) : null}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="enterprise-hero py-20 text-white md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-sky-400">
          {ENTERPRISE_HERO.badge}
        </p>
        <h1 className="mb-6 text-3xl font-bold leading-tight md:text-5xl">{tUi(ENTERPRISE_HERO.title)}</h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300">{tUi(ENTERPRISE_HERO.description)}</p>
        <a
          href="#enterprise-contact"
          className="mt-10 inline-block rounded-lg bg-[#0066cc] px-8 py-3.5 font-bold text-white transition hover:bg-blue-700"
        >
          {tUi("Đặt lịch tư vấn")}
        </a>
      </div>
    </section>
  );
}

function CoreBenefitsSection() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={tUi("Lợi ích cốt lõi")}
          subtitle={tUi("Tại sao tập đoàn và doanh nghiệp lớn nên chọn Vĩnh Long Connect Enterprise?")}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {CORE_BENEFITS.map((item) => {
            const Icon = BENEFIT_ICONS[item.icon];
            return (
              <article
                key={tUi(item.title)}
                className="enterprise-benefit-card border border-gray-100 bg-gray-50 p-8 shadow-sm"
              >
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1c2e4a] text-sky-400">
                  <Icon className="text-2xl" aria-hidden />
                </span>
                <h3 className="mb-3 text-lg font-bold text-[#1c2e4a]">{tUi(item.title)}</h3>
                <p className="text-sm leading-relaxed text-gray-600 md:text-base">{tUi(item.description)}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AdvancedFeaturesSection() {
  return (
    <section id="enterprise-api" className="border-y border-gray-100 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={tUi("Tính năng quản lý nâng cao")}
          subtitle={tUi("Công cụ được thiết kế riêng cho tổ chức lớn — quản lý tập trung, báo cáo chi tiết, tích hợp liền mạch.")}
        />
        <div className="grid gap-8 lg:grid-cols-3">
          {ADVANCED_FEATURES.map((item) => {
            const Icon = FEATURE_ICONS[item.icon];
            return (
              <article key={tUi(item.title)} className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0066cc]/10">
                  <Icon className="text-2xl text-[#0066cc]" aria-hidden />
                </span>
                <h3 className="mb-3 text-lg font-bold text-[#1c2e4a]">{tUi(item.title)}</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">{tUi(item.description)}</p>
                {"linkHref" in item && item.linkHref ? (
                  <Link href={item.linkHref} className="text-sm font-semibold text-[#0066cc] hover:underline">
                    {item.linkLabel} →
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DedicatedSupportSection() {
  return (
    <section className="enterprise-support-panel py-20 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <FaHeadset className="mb-6 text-5xl text-sky-400" aria-hidden />
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">{tUi(DEDICATED_SUPPORT.title)}</h2>
            <p className="text-lg text-neutral-300">{tUi(DEDICATED_SUPPORT.subtitle)}</p>
          </div>
          <ul className="space-y-4">
            {DEDICATED_SUPPORT.highlights.map((point) => (
              <li key={point} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <FaCheckCircle className="mt-0.5 shrink-0 text-sky-400" aria-hidden />
                <span className="text-sm leading-relaxed text-neutral-200 md:text-base">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={tUi("Bằng chứng năng lực")}
          subtitle={tUi("Các đối tác doanh nghiệp đã tin tưởng giải pháp Enterprise của Vĩnh Long Connect.")}
        />

        <div className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PARTNER_LOGOS.map((partner) => (
            <div
              key={tUi(partner.name)}
              className="enterprise-logo-tile flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-5 text-center"
            >
              <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-[#1c2e4a] text-sm font-bold text-white">
                {partner.initials}
              </span>
              <span className="text-xs font-semibold text-gray-600">{tUi(partner.name)}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {CASE_STUDIES.map((study) => (
            <article key={tUi(study.title)} className="enterprise-case-card border border-gray-100 bg-gray-50 p-8 shadow-sm">
              <span className="mb-2 inline-block text-xs font-bold uppercase tracking-wide text-[#0066cc]">
                {study.industry}
              </span>
              <h3 className="mb-4 text-xl font-bold text-[#1c2e4a]">{tUi(study.title)}</h3>
              <p className="mb-6 text-sm leading-relaxed text-gray-600">{tUi(study.summary)}</p>
              <div className="flex items-baseline gap-2 border-t border-gray-200 pt-4">
                <span className="text-3xl font-bold text-[#0066cc]">{study.metric}</span>
                <span className="text-sm text-gray-500">{study.metricLabel}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactFormSection() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  }

  return (
    <section id="enterprise-contact" className="border-t border-gray-100 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          title={tUi("Liên hệ bộ phận Sales")}
          subtitle={tUi("Điền thông tin để đội ngũ Enterprise chủ động liên hệ tư vấn giải pháp phù hợp với doanh nghiệp của bạn.")}
        />

        {submitted ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <FaCheckCircle className="mx-auto mb-4 text-4xl text-green-600" aria-hidden />
            <h3 className="mb-2 text-xl font-bold text-[#1c2e4a]">{tUi("Đã gửi yêu cầu tư vấn")}</h3>
            <p className="text-gray-600">
              {tUi("Cảm ơn bạn! Account Manager sẽ liên hệ trong vòng 1–2 ngày làm việc để đặt lịch demo và trao đổi nhu cầu chi tiết.")}
            </p>
          </div>
        ) : (
          <form className="enterprise-form rounded-2xl border border-gray-100 bg-white p-8 shadow-sm md:p-10" onSubmit={handleSubmit}>
            <div className="grid gap-x-6 md:grid-cols-2">
              <div className="enterprise-form__field">
                <label htmlFor="company">{tUi("Tên công ty *")}</label>
                <input id="company" name="company" type="text" required placeholder={tUi("Công ty TNHH ABC")} />
              </div>
              <div className="enterprise-form__field">
                <label htmlFor="size">{tUi("Quy mô doanh nghiệp *")}</label>
                <select id="size" name="size" required defaultValue="">
                  <option value="" disabled>
                    {tUi("Chọn quy mô")}
                  </option>
                  {COMPANY_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="enterprise-form__field">
                <label htmlFor="contactName">{tUi("Họ tên người liên hệ *")}</label>
                <input id="contactName" name="contactName" type="text" required placeholder={tUi("Nguyễn Văn A")} />
              </div>
              <div className="enterprise-form__field">
                <label htmlFor="email">{tUi("Email công việc *")}</label>
                <input id="email" name="email" type="email" required placeholder="name@company.com" />
              </div>
              <div className="enterprise-form__field md:col-span-2">
                <label htmlFor="phone">{tUi("Số điện thoại")}</label>
                <input id="phone" name="phone" type="tel" placeholder="090x xxx xxx" />
              </div>
              <div className="enterprise-form__field md:col-span-2">
                <label htmlFor="needs">{tUi("Nhu cầu / Mô tả dự án *")}</label>
                <textarea
                  id="needs"
                  name="needs"
                  required
                  rows={4}
                  placeholder={tUi("Ví dụ: Cần 5 developer full-stack trong 3 tháng, hóa đơn VAT gộp cuối tháng...")}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-lg bg-[#0066cc] py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Đang gửi..." : "Đặt lịch tư vấn / Book a Demo"}
            </button>
            <p className="mt-4 text-center text-xs text-gray-500">
              {tUi("Bằng việc gửi form, bạn đồng ý để đội ngũ VLC Enterprise liên hệ qua email hoặc điện thoại.")}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default function EnterpriseContent() {
  const { t } = useTranslation();

  return (
    <div className="enterprise-page min-h-screen bg-white text-gray-900">
      <HeroSection />
      <CoreBenefitsSection />
      <AdvancedFeaturesSection />
      <DedicatedSupportSection />
      <TrustSection />
      <ContactFormSection />
    </div>
  );
}
