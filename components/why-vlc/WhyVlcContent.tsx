"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  FaBuilding,
  FaChartLine,
  FaClock,
  FaFileInvoiceDollar,
  FaGlobeAsia,
  FaHandshake,
  FaHeadset,
  FaMoneyBillWave,
  FaShieldAlt,
  FaStar,
  FaThumbsUp,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import {
  CLIENT_BENEFITS,
  FREELANCER_BENEFITS,
  SOCIAL_STATS,
  TESTIMONIALS,
  USPS,
  WHY_VLC_CTA,
  WHY_VLC_HERO,
} from "./whyVlcData";
import "./why-vlc.css";

const CLIENT_ICONS = {
  talent: FaUsers,
  cost: FaMoneyBillWave,
  manage: FaChartLine,
} as const;

const FREELANCER_ICONS = {
  projects: FaStar,
  safepay: FaShieldAlt,
  fee: FaHandshake,
} as const;

const USP_ICONS = {
  local: FaGlobeAsia,
  support: FaHeadset,
  trust: FaShieldAlt,
} as const;

const STAT_ICONS = {
  users: FaUsers,
  invoice: FaFileInvoiceDollar,
  money: FaMoneyBillWave,
  thumbs: FaThumbsUp,
} as const;

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-12 text-center">
      <h2 className="why-vlc-section-title text-2xl font-bold text-[#1c2e4a] md:text-3xl">{title}</h2>
      {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-gray-600">{subtitle}</p> : null}
    </div>
  );
}

function HeroSection() {
  const t = tUi;
  return (
    <section className="why-vlc-hero relative overflow-hidden py-20 text-white md:py-28">
      <div className="absolute inset-0">
        <Image
          src="/Media/vinhlonga.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
      <div className="why-vlc-hero__overlay absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-300">
          {tUi("Tại sao chọn VLC")}
        </p>
        <h1 className="mb-6 text-3xl font-bold leading-tight md:text-5xl">{WHY_VLC_HERO.slogan}</h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
          {tUi(WHY_VLC_HERO.description)}
        </p>
      </div>
    </section>
  );
}

type BenefitItem = {
  icon: string;
  title: string;
  description: string;
};

function BenefitCard({
  item,
  icons,
}: {
  item: BenefitItem;
  icons: Record<string, React.ComponentType<{ className?: string }>>;
}) {
  const t = tUi;
  const Icon = icons[item.icon];
  return (
    <article className="why-vlc-benefit-card border border-gray-100 bg-white p-7 shadow-sm">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0066cc]/10">
        <Icon className="text-2xl text-[#0066cc]" aria-hidden />
      </span>
      <h3 className="mb-3 text-lg font-bold text-[#1c2e4a]">{tUi(item.title)}</h3>
      <p className="text-sm leading-relaxed text-gray-600 md:text-base">{tUi(item.description)}</p>
    </article>
  );
}

function ClientBenefitsSection() {
  const t = tUi;
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={tUi("Lợi thế dành cho Doanh nghiệp / Người thuê")}
          subtitle={tUi("Giải quyết nỗi đau khi tìm kiếm nhân sự linh hoạt, nhanh và đáng tin cậy.")}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {CLIENT_BENEFITS.map((item) => (
            <BenefitCard key={tUi(item.title)} item={item} icons={CLIENT_ICONS} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FreelancerBenefitsSection() {
  const t = tUi;
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={tUi("Đặc quyền dành cho Freelancer")}
          subtitle={tUi("Nơi người làm tự do phát triển sự nghiệp bền vững với thu nhập được bảo vệ.")}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {FREELANCER_BENEFITS.map((item) => (
            <BenefitCard key={tUi(item.title)} item={item} icons={FREELANCER_ICONS} />
          ))}
        </div>
      </div>
    </section>
  );
}

function UspSection() {
  const t = tUi;
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title={tUi("Điểm khác biệt cốt lõi")}
          subtitle={tUi("Tại sao chọn Vĩnh Long Connected mà không phải nền tảng khác?")}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {USPS.map((item) => {
            const Icon = USP_ICONS[item.icon];
            return (
              <article
                key={tUi(item.title)}
                className="why-vlc-usp-card border border-gray-100 p-8 text-center shadow-sm"
              >
                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0066cc] text-white">
                  <Icon className="text-2xl" aria-hidden />
                </span>
                <h3 className="mb-3 text-lg font-bold text-[#1c2e4a]">{tUi(item.title)}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{tUi(item.description)}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SocialProofSection() {
  const t = tUi;
  return (
    <section className="border-t border-gray-100 bg-gray-50 pb-20 pt-8 md:pb-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="why-vlc-stats-bar relative z-10 rounded-2xl bg-white px-6 py-8 shadow-xl md:px-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {SOCIAL_STATS.map((stat) => {
              const Icon = STAT_ICONS[stat.icon];
              const highlight = "highlight" in stat && stat.highlight;
              return (
                <div
                  key={tUi(stat.label)}
                  className={`flex items-center gap-4 ${
                    highlight ? "rounded-xl bg-blue-50 p-4 md:col-span-1" : ""
                  }`}
                >
                  <Icon className={`shrink-0 text-3xl ${highlight ? "text-[#0066cc]" : "text-blue-400"}`} />
                  <div>
                    <div className="text-xl font-bold text-[#1c2e4a]">{stat.value}</div>
                    <div className="text-xs text-gray-500 md:text-sm">{tUi(stat.label)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-20">
          <SectionHeading title={tUi("Khách hàng & Freelancer nói gì?")} />
          <TestimonialCarousel />
        </div>
      </div>
    </section>
  );
}

function TestimonialCarousel() {
  const t = tUi;
  const [active, setActive] = useState(0);
  const item = TESTIMONIALS[active];

  return (
    <div className="mx-auto max-w-3xl">
      <blockquote className="why-vlc-testimonial-card bg-white p-8 shadow-sm md:p-10">
        <p className="mb-8 text-base italic leading-relaxed text-gray-600 md:text-lg">
          &ldquo;{item.quote}&rdquo;
        </p>
        <footer className="flex items-center gap-4">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${
              item.type === "client" ? "bg-[#0066cc]" : "bg-indigo-500"
            }`}
            aria-hidden
          >
            {item.type === "client" ? <FaBuilding /> : <FaUserTie />}
          </span>
          <div>
            <cite className="not-italic font-bold text-[#1c2e4a]">{tUi(item.name)}</cite>
            <p className="text-sm text-gray-500">{item.role}</p>
          </div>
        </footer>
      </blockquote>

      <div className="mt-6 flex items-center justify-center gap-2">
        {TESTIMONIALS.map((item, i) => (
          <button
            key={tUi(item.name)}
            type="button"
            aria-label={`Xem đánh giá ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              i === active ? "w-8 bg-[#0066cc]" : "w-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}

function CtaSection() {
  const t = tUi;
  return (
    <section className="why-vlc-cta py-16 text-white md:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <FaClock className="mx-auto mb-6 text-4xl text-blue-400" aria-hidden />
        <h2 className="mb-4 text-2xl font-bold md:text-3xl">{tUi(WHY_VLC_CTA.title)}</h2>
        <p className="mb-10 text-neutral-300">{tUi(WHY_VLC_CTA.subtitle)}</p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={WHY_VLC_CTA.client.href}
            className="rounded-lg bg-[#0066cc] px-8 py-3.5 font-bold text-white transition hover:bg-blue-700"
          >
            {tUi(WHY_VLC_CTA.client.label)}
          </Link>
          <Link
            href={WHY_VLC_CTA.freelancer.href}
            className="rounded-lg border-2 border-white/60 px-8 py-3.5 font-bold text-white transition hover:border-white hover:bg-white/10"
          >
            {tUi(WHY_VLC_CTA.freelancer.label)}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function WhyVlcContent() {
  const { t } = useTranslation();

  return (
    <div className="why-vlc-page min-h-screen bg-white text-gray-900">
      <HeroSection />
      <ClientBenefitsSection />
      <FreelancerBenefitsSection />
      <UspSection />
      <SocialProofSection />
      <CtaSection />
    </div>
  );
}
