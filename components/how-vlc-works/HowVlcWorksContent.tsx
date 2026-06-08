"use client";

import Link from "next/link";
import { useState } from "react";
import { FaArrowRight, FaBriefcase, FaBuilding, FaUserTie } from "react-icons/fa";
import {
  CLIENT_STEPS,
  FREELANCER_STEPS,
  HOW_VLC_CTA,
  HOW_VLC_HERO,
  ROLE_OPTIONS,
  WORKFLOW_STAGES,
  type AudienceRole,
} from "./howVlcWorksData";
import "./how-vlc-works.css";

const ROLE_ICONS = {
  client: FaBuilding,
  freelancer: FaUserTie,
} as const;

function HeroSection() {
  return (
    <section className="how-vlc-hero py-16 text-white md:py-20">
      <div className="how-vlc-container how-vlc-prose text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300">
          Hướng dẫn sử dụng
        </p>
        <h1 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">{HOW_VLC_HERO.title}</h1>
        <p className="text-lg leading-relaxed text-neutral-300">{HOW_VLC_HERO.subtitle}</p>
      </div>
    </section>
  );
}

function RoleSwitch({
  role,
  onChange,
}: {
  role: AudienceRole;
  onChange: (role: AudienceRole) => void;
}) {
  return (
    <div
      className="how-vlc-role-switch"
      role="tablist"
      aria-label="Chọn vai trò của bạn"
    >
      {ROLE_OPTIONS.map((option) => {
        const Icon = ROLE_ICONS[option.id];
        const active = role === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`how-vlc-role-btn${active ? " how-vlc-role-btn--active" : ""}`}
            onClick={() => onChange(option.id)}
          >
            <span className="flex items-center gap-2">
              <Icon className={active ? "text-[#0066cc]" : "text-gray-400"} aria-hidden />
              <span className="how-vlc-role-btn__label">{option.label}</span>
            </span>
            <span className="how-vlc-role-btn__hint">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

type StepItem = (typeof CLIENT_STEPS)[number];

function ProcessSteps({ steps, role }: { steps: readonly StepItem[]; role: AudienceRole }) {
  return (
    <div
      role="tabpanel"
      aria-label={role === "client" ? "Quy trình người thuê" : "Quy trình freelancer"}
      className="how-vlc-steps"
    >
      {steps.map((item) => (
        <article key={item.step} className="how-vlc-step-card" data-step={item.step}>
          <h3 className="mb-2 text-lg font-bold text-[#1c2e4a]">{item.title}</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-600 md:text-base">{item.description}</p>
          <Link
            href={item.route}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066cc] transition hover:text-blue-700"
          >
            {item.routeLabel}
            <FaArrowRight className="text-xs" aria-hidden />
          </Link>
        </article>
      ))}
    </div>
  );
}

function WorkflowSection({ role }: { role: AudienceRole }) {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-16 md:py-20">
      <div className="how-vlc-container">
        <div className="mb-12 text-center">
          <h2 className="how-vlc-section-title text-2xl font-bold text-[#1c2e4a] md:text-3xl">
            5 giai đoạn hợp đồng trên nền tảng
          </h2>
          <p className="how-vlc-prose mx-auto mt-4 text-gray-600">
            Sau khi chốt báo giá, client và freelancer cùng làm việc theo quy trình Escrow an toàn —
            giống như trên trang Đơn dịch vụ trong hệ thống.
          </p>
        </div>

        <div className="how-vlc-workflow-track">
          {WORKFLOW_STAGES.map((stage) => (
            <div key={stage.id} className="how-vlc-workflow-stage how-vlc-workflow-stage--active">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#0066cc]">
                {stage.label}
              </span>
              <h3 className="mb-3 text-sm font-bold leading-snug text-[#1c2e4a]">{stage.title}</h3>
              <p className="text-xs leading-relaxed text-gray-500">
                {role === "client" ? stage.clientHint : stage.freelancerHint}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ role }: { role: AudienceRole }) {
  const cta = HOW_VLC_CTA[role];

  return (
    <section className="how-vlc-cta py-16 text-white md:py-20">
      <div className="how-vlc-container how-vlc-prose text-center">
        <FaBriefcase className="mx-auto mb-6 text-4xl text-blue-400" aria-hidden />
        <h2 className="mb-4 text-2xl font-bold md:text-3xl">{cta.title}</h2>
        <p className="mb-10 text-neutral-300">{cta.subtitle}</p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={cta.primary.href}
            className="rounded-lg bg-[#0066cc] px-8 py-3.5 font-bold text-white transition hover:bg-blue-700"
          >
            {cta.primary.label}
          </Link>
          <Link
            href={cta.secondary.href}
            className="rounded-lg border-2 border-white/60 px-8 py-3.5 font-bold text-white transition hover:border-white hover:bg-white/10"
          >
            {cta.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HowVlcWorksContent() {
  const [role, setRole] = useState<AudienceRole>("client");
  const steps = role === "client" ? CLIENT_STEPS : FREELANCER_STEPS;

  return (
    <div className="how-vlc-page min-h-screen bg-white text-gray-900">
      <HeroSection />

      <section className="border-b border-gray-100 bg-white py-12 md:py-16">
        <div className="how-vlc-container">
          <RoleSwitch role={role} onChange={setRole} />

          <div className="mt-14">
            <div className="mb-10 text-center">
              <h2 className="how-vlc-section-title text-2xl font-bold text-[#1c2e4a]">
                {role === "client" ? "Quy trình dành cho Người thuê" : "Quy trình dành cho Freelancer"}
              </h2>
              <p className="how-vlc-prose mx-auto mt-4 text-gray-600">
                {role === "client"
                  ? "Từ đăng ký, đăng việc đến nghiệm thu và thanh toán — theo đúng luồng trong ứng dụng."
                  : "Từ xây dựng hồ sơ, gửi báo giá đến nhận thanh toán — theo đúng luồng trong ứng dụng."}
              </p>
            </div>
            <ProcessSteps steps={steps} role={role} />
          </div>
        </div>
      </section>

      <WorkflowSection role={role} />
      <CtaSection role={role} />
    </div>
  );
}
