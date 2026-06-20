"use client";

import styles from "./auth.module.css";
import GoogleLogo from "@/components/icons/GoogleLogo";
import { useTranslation } from "@/hooks/useTranslation";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type GoogleButtonProps = {
  nextPath?: string | null;
  role?: "client" | "freelancer";
};

export default function GoogleButton({
  nextPath, role }: GoogleButtonProps) {
  const { t } = useTranslation();

  const apiBaseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  if (role) params.set("role", role);
  const qs = params.toString();
  const href = apiUrl(
    qs ? `${apiPaths.auth.google}?${qs}` : apiPaths.auth.google,
    apiBaseUrl,
  );

  return (
    <a href={href} className={styles.googleButton}>
      <GoogleLogo size={20} />
      {t("auth.googleContinue")}
    </a>
  );
}
