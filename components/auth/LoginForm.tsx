"use client";

import { tUi } from "@/lib/i18n/runtime";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthLayout from "./AuthLayout";
import GoogleButton from "./GoogleButton";
import { useTranslation } from "@/hooks/useTranslation";
import { login } from "@/lib/api/auth";
import { persistAuthTokens, persistStoredUser, toStoredUser } from "@/lib/authSession";
import { resolvePostLoginPath } from "@/lib/auth/roleRoutes";
import styles from "./auth.module.css";

function safeNextPath(raw: string | null): string | null {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginForm() {
  const { t } = useTranslation();

  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 4500);
    return () => window.clearTimeout(timer);
  }, [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await login({ email, password });

      if (typeof window !== "undefined" && data.user) {
        persistAuthTokens({
          accessToken: data.tokens?.accessToken,
          refreshToken: data.tokens?.refreshToken,
        });
        persistStoredUser(toStoredUser(data.user));
      }

      setSuccess(t("auth.loginSuccess"));
      router.push(resolvePostLoginPath(data.user?.role, nextPath));
      router.refresh();
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
    <AuthLayout variant="login">
      <h2 className={styles.title}>{t("auth.login")}</h2>
      <p className={styles.subtitle}>{t("auth.loginSubtitle")}</p>

      {error ? (
        <div className={styles.toastStack} role="alert" aria-live="assertive">
          <div className={styles.toastError}>
            <div>
              <p className={styles.toastTitle}>{t("auth.loginFailed")}</p>
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
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            {t("common.email")}
          </label>
          <input
            id="login-email"
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
          <label className={styles.label} htmlFor="login-password">
            {t("common.password")}
          </label>
          <input
            id="login-password"
            required
            type="password"
            autoComplete="current-password"
            className={styles.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? t("common.processing") : t("auth.login")}
        </button>
      </form>

      <div className={styles.divider}>{t("common.or")}</div>
      <GoogleButton nextPath={nextPath} />

      <p className={styles.helperText}>
        {t("auth.noAccount")}{" "}
        <Link href={nextPath ? `/dang-ky?next=${encodeURIComponent(nextPath)}` : "/dang-ky"}>
          {t("auth.signUpNow")}
        </Link>
      </p>
    </AuthLayout>
  );
}
