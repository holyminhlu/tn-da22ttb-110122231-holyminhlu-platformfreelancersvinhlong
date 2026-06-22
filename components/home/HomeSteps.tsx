"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { StepIcon } from "./icons";

export default function HomeSteps() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: "clipboard" as const,
      title: t("homeSteps.step1Title"),
      desc: t("homeSteps.step1Desc"),
    },
    {
      icon: "tie" as const,
      title: t("homeSteps.step2Title"),
      desc: t("homeSteps.step2Desc"),
    },
    {
      icon: "desktop" as const,
      title: t("homeSteps.step3Title"),
      desc: t("homeSteps.step3Desc"),
    },
    {
      icon: "card" as const,
      title: t("homeSteps.step4Title"),
      desc: t("homeSteps.step4Desc"),
    },
  ];

  return (
    <section id="steps" className="border-b border-t border-border bg-muted py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">{t("homePage.stepsTitle")}</h2>
          <div className="mx-auto h-1 w-12 bg-primary" />
        </div>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                <StepIcon name={step.icon} className="text-2xl text-primary" />
              </div>
              <h3 className="mb-3 font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <button
            type="button"
            className="rounded bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:opacity-90"
          >
            {t("homePage.stepsCta")}
          </button>
        </div>
      </div>
    </section>
  );
}
