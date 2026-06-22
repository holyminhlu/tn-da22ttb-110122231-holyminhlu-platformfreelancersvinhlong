"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import Link from "next/link";
import {
  FaBuilding,
  FaCheckCircle,
  FaEye,
  FaHandshake,
  FaLock,
  FaShieldAlt,
  FaStar,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";
import {
  ABOUT_CTA,
  ABOUT_INTRO,
  CORE_VALUES,
  STORY,
  TEAM_MEMBERS,
  WHY_CHOOSE,
} from "./aboutData";
import "./about.css";

const VALUE_ICONS = {
  transparency: FaEye,
  security: FaLock,
  quality: FaStar,
  community: FaUsers,
} as const;

const AUDIENCE_ICONS = {
  building: FaBuilding,
  user: FaUserTie,
} as const;

function SectionHeading({ title, centered = true }: { title: string; centered?: boolean }) {
  return (
    <div className={centered ? "mb-12 text-center" : "mb-8"}>
      <h2 className={`about-section-title text-3xl font-bold text-[#1c2e4a] ${centered ? "" : "text-left"}`}>
        {title}
      </h2>
    </div>
  );
}

function IntroSection() {
  const { t } = useTranslation();
  return (
    <section className="about-hero relative overflow-hidden py-20 text-white md:py-28">
      <div className="absolute inset-0">
        <Image
          src="/Media/anhVinhLong2.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
      <div className="about-hero__overlay absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-300">
            {tUi("Vĩnh Long Connect")}
          </p>
          <h1 className="mb-6 text-3xl font-bold leading-tight md:text-5xl">{tUi(ABOUT_INTRO.title)}</h1>
          <p className="text-lg leading-relaxed text-neutral-300 md:text-xl">{tUi(ABOUT_INTRO.subtitle)}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="about-mission-card bg-white/10 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0066cc]">
                <FaHandshake className="text-lg text-white" />
              </span>
              <h3 className="text-xl font-bold">{tUi(ABOUT_INTRO.mission.title)}</h3>
            </div>
            <p className="leading-relaxed text-neutral-300">{tUi(ABOUT_INTRO.mission.description)}</p>
          </div>

          <div className="about-vision-card bg-white/10 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400">
                <FaEye className="text-lg text-white" />
              </span>
              <h3 className="text-xl font-bold">{tUi(ABOUT_INTRO.vision.title)}</h3>
            </div>
            <p className="leading-relaxed text-neutral-300">{tUi(ABOUT_INTRO.vision.description)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyChooseSection() {
  const { t } = useTranslation();
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading title={tUi("Tại sao chọn Vĩnh Long Connect?")} />

        <div className="grid gap-8 lg:grid-cols-2">
          {WHY_CHOOSE.map((item) => {
            const Icon = AUDIENCE_ICONS[item.icon];
            return (
              <div
                key={item.audience}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0066cc]/10">
                    <Icon className="text-2xl text-[#0066cc]" />
                  </span>
                  <h3 className="text-xl font-bold text-[#1c2e4a]">Đối với {item.audience}</h3>
                </div>
                <ul className="space-y-4">
                  {item.highlights.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-gray-600">
                      <FaCheckCircle className="mt-0.5 shrink-0 text-[#0066cc]" />
                      <span className="text-sm leading-relaxed md:text-base">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StorySection() {
  const { t } = useTranslation();
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading title={tUi(STORY.title)} />

        <div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl">
            <Image
              src="/Media/congchaoVL.jpg"
              alt={tUi("Cảnh quan Vĩnh Long — nơi khởi nguồn Vĩnh Long Connect")}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div>
            <p className="mb-4 text-lg font-medium leading-relaxed text-[#1c2e4a]">{STORY.intro}</p>
            <p className="leading-relaxed text-gray-600">{STORY.body}</p>
          </div>
        </div>

        <div className="about-timeline relative space-y-10 md:space-y-0">
          {STORY.milestones.map((milestone, index) => (
            <div
              key={milestone.year}
              className={`relative flex flex-col gap-4 md:flex-row md:items-center ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              <div className="hidden flex-1 md:block" />
              <div className="relative z-10 mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-sm font-bold text-white shadow-lg md:mx-0">
                {index + 1}
              </div>
              <div className="flex-1 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-[#0066cc]">{milestone.year}</span>
                <h4 className="mt-1 mb-2 text-lg font-bold text-[#1c2e4a]">{tUi(milestone.title)}</h4>
                <p className="text-sm leading-relaxed text-gray-600">{tUi(milestone.description)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoreValuesSection() {
  const { t } = useTranslation();
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading title={tUi("Giá trị cốt lõi")} />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_VALUES.map((value) => {
            const Icon = VALUE_ICONS[value.icon];
            return (
              <div
                key={tUi(value.title)}
                className="group rounded-2xl border border-gray-100 p-6 text-center transition hover:border-[#0066cc]/30 hover:shadow-lg"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0066cc]/10 transition group-hover:bg-[#0066cc]">
                  <Icon className="text-2xl text-[#0066cc] transition group-hover:text-white" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-[#1c2e4a]">{tUi(value.title)}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{tUi(value.description)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  const { t } = useTranslation();
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading title={tUi("Đội ngũ của chúng tôi")} />
        <p className="-mt-6 mb-12 text-center text-gray-600">
          {tUi("Những con người đam mê đang vận hành và phát triển Vĩnh Long Connect mỗi ngày.")}
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={tUi(member.name)}
              className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <div
                className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${member.accent} text-2xl font-bold text-white shadow-lg`}
              >
                {member.initials}
              </div>
              <h3 className="mb-1 text-lg font-bold text-[#1c2e4a]">{tUi(member.name)}</h3>
              <p className="mb-4 text-sm font-medium text-[#0066cc]">{member.role}</p>
              <p className="text-sm leading-relaxed text-gray-500">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  const { t } = useTranslation();
  return (
    <section className="about-cta py-16 text-white md:py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <FaShieldAlt className="mx-auto mb-6 text-4xl text-blue-400" />
        <h2 className="mb-4 text-2xl font-bold md:text-3xl">{tUi(ABOUT_CTA.title)}</h2>
        <p className="mb-10 text-neutral-300">{tUi(ABOUT_CTA.subtitle)}</p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
          {ABOUT_CTA.actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.variant === "primary"
                  ? "rounded-lg bg-[#0066cc] px-8 py-3.5 font-bold text-white transition hover:bg-blue-700"
                  : action.variant === "secondary"
                    ? "rounded-lg bg-white px-8 py-3.5 font-bold text-[#1c2e4a] transition hover:bg-neutral-100"
                    : "rounded-lg border-2 border-white/60 px-8 py-3.5 font-bold text-white transition hover:border-white hover:bg-white/10"
              }
            >
              {tUi(action.label)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AboutPageContent() {
  return (
    <div className="about-page min-h-screen bg-white text-gray-900">
      <IntroSection />
      <WhyChooseSection />
      <StorySection />
      <CoreValuesSection />
      <TeamSection />
      <CtaSection />
    </div>
  );
}
