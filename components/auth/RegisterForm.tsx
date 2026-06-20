"use client";

import { tUi } from "@/lib/i18n/runtime";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthLayout from "./AuthLayout";
import GoogleButton from "./GoogleButton";
import { useTranslation } from "@/hooks/useTranslation";
import { register } from "@/lib/api/auth";
import styles from "./auth.module.css";

type Role = "client" | "freelancer";

function safeNextPath(raw: string | null): string | null {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function RegisterForm() {
  const { t } = useTranslation();

  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [role, setRole] = useState<Role>("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
  const strengthScore = Object.values(checks).filter(Boolean).length;
  const strengthClass =
    strengthScore <= 1
      ? styles.weak
      : strengthScore <= 3
        ? styles.medium
        : strengthScore === 4
          ? styles.good
          : styles.strong;
  const strengthLabel =
    strengthScore <= 1
      ? t("auth.passwordWeak")
      : strengthScore <= 3
        ? t("auth.passwordMedium")
        : strengthScore === 4
          ? t("auth.passwordGood")
          : t("auth.passwordStrong");
  const isPasswordStrong = Object.values(checks).every(Boolean);
  const showPasswordFeedback = password.length > 0 && !isPasswordStrong;

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 4500);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const loginHref = nextPath
      ? `/dang-nhap?next=${encodeURIComponent(nextPath)}`
      : "/dang-nhap";
    const timer = window.setTimeout(() => router.push(loginHref), 1300);
    return () => window.clearTimeout(timer);
  }, [router, success, nextPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  const t = tUi;
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isPasswordStrong) {
      setError(t("auth.passwordNotStrong"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const data = await register({ role, fullName, email, password });
      setSuccess(data.message || t("auth.registerSuccessFallback"));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "";
      setError(message || t("auth.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="register">
      <h2 className={styles.title}>{t("auth.register")}</h2>
        <p className={styles.subtitle}>{t("auth.registerSubtitle")}</p>

        {error ? (
          <div className={styles.toastStack} role="alert" aria-live="assertive">
            <div className={styles.toastError}>
              <div>
                <p className={styles.toastTitle}>{t("auth.registerFailed")}</p>
                <p className={styles.toastMessage}>{error}</p>
              </div>
              <button
                type="button"
                className={styles.toastClose}
                onClick={() => setError("")}
                aria-label={t("common.closeNotification")}
              >
                ×
              </button>
            </div>
          </div>
        ) : null}

        {success ? (
          <p className={`${styles.inlineAlert} ${styles.inlineAlertSuccess}`} role="status">
            {success}
          </p>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className={styles.roleGroup} role="group" aria-label={t("auth.role")}>
            <button
              type="button"
              className={`${styles.roleBtn}${role === "client" ? ` ${styles.roleBtnActive}` : ""}`}
              aria-pressed={role === "client"}
              onClick={() => setRole("client")}
            >
              {t("auth.client")}
              <span>{t("auth.clientDesc")}</span>
            </button>
            <button
              type="button"
              className={`${styles.roleBtn}${role === "freelancer" ? ` ${styles.roleBtnActive}` : ""}`}
              aria-pressed={role === "freelancer"}
              onClick={() => setRole("freelancer")}
            >
              {t("common.freelancer")}
              <span>{t("auth.freelancerDesc")}</span>
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-name">
              {t("auth.fullName")}
            </label>
            <input
              id="reg-name"
              required
              type="text"
              autoComplete="name"
              className={styles.input}
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-email">
              {t("common.email")}
            </label>
            <input
              id="reg-email"
              required
              type="email"
              autoComplete="email"
              className={styles.input}
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-password">
              {t("common.password")}
            </label>
            <input
              id="reg-password"
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {showPasswordFeedback ? (
            <div className={styles.passwordMeter}>
              <div className={styles.meterTrack}>
                <div
                  className={`${styles.meterFill} ${strengthClass}`}
                  style={{ width: `${(strengthScore / 5) * 100}%` }}
                />
              </div>
              <p className={styles.meterText}>{t("auth.passwordStrength", { label: strengthLabel })}</p>
              <ul className={styles.requirements}>
                <li className={checks.minLength ? styles.requirementOk : styles.requirementMissing}>
                  {t("auth.reqMinLength")}
                </li>
                <li className={checks.hasUpper ? styles.requirementOk : styles.requirementMissing}>
                  {t("auth.reqUpper")}
                </li>
                <li className={checks.hasLower ? styles.requirementOk : styles.requirementMissing}>
                  {t("auth.reqLower")}
                </li>
                <li className={checks.hasNumber ? styles.requirementOk : styles.requirementMissing}>
                  {t("auth.reqNumber")}
                </li>
                <li className={checks.hasSpecial ? styles.requirementOk : styles.requirementMissing}>
                  {t("auth.reqSpecial")}
                </li>
              </ul>
            </div>
          ) : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-confirm">
              {t("auth.confirmPassword")}
            </label>
            <input
              id="reg-confirm"
              required
              type="password"
              autoComplete="new-password"
              className={styles.input}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? t("common.processing") : t("auth.createAccount")}
          </button>
        </form>

        <div className={styles.divider}>{t("common.or")}</div>
        <GoogleButton nextPath={nextPath} role={role} />

      <p className={styles.helperText}>
        {t("auth.hasAccount")}{" "}
        <Link href={nextPath ? `/dang-nhap?next=${encodeURIComponent(nextPath)}` : "/dang-nhap"}>
          {t("auth.login")}
        </Link>
      </p>
    </AuthLayout>
  );
}
