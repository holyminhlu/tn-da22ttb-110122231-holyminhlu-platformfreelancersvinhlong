"use client";

import AuthParticleStorm from "./AuthParticleStorm";
import { useTranslation } from "@/hooks/useTranslation";
import styles from "./auth.module.css";
type AuthLayoutProps = {
  children: React.ReactNode;
  variant: "login" | "register";
};

export default function AuthLayout({
  children, variant }: AuthLayoutProps) {
  const { t } = useTranslation();

  const isRegister = variant === "register";
  const title = isRegister ? t("auth.joinVlc") : t("auth.welcomeBack");
  const lead = isRegister ? t("auth.registerLead") : t("auth.loginLead");

  return (
    <div className={`auth-page ${styles.page}${isRegister ? ` ${styles.pageRegister}` : ""}`}>
      <div className={`${styles.grid}${isRegister ? ` ${styles.gridRegister}` : ""}`}>
        <aside
          className={`${styles.heroPanel}${isRegister ? ` ${styles.heroSticky}` : ""}`}
          aria-hidden
        >
          <AuthParticleStorm className={styles.heroCanvas} />
        </aside>
        <main
          id="main-content"
          className={`${styles.main}${isRegister ? ` ${styles.mainScroll}` : ""}`}
        >
          <div className={styles.mobileHero}>
            <p className={styles.mobileHeroTitle}>{title}</p>
            <p className={styles.mobileHeroLead}>{lead}</p>
          </div>
          <div className={`${styles.card}${variant === "register" ? ` ${styles.cardWide}` : ""}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
