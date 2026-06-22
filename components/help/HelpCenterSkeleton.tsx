"use client";

import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import { useTranslation } from "@/hooks/useTranslation";
import "@/components/home/home.css";
import "./help.css";

export default function HelpCenterSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="home-landing help-page help-center flex min-h-screen flex-col text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="flex-grow">
        <section className="help-center-hero" aria-hidden>
          <div className="help-center-hero__title">&nbsp;</div>
        </section>
        <section className="help-center-panel">
          <div className="help-center-panel__body">
            <p className="help-center-empty">{t("common.loading")}</p>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
