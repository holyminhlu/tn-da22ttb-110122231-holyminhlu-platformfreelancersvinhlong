"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthLayout from "./AuthLayout";
import GoogleButton from "./GoogleButton";
import { login } from "@/lib/api/auth";
import { persistAuthTokens, persistStoredUser, toStoredUser } from "@/lib/authSession";
import { resolvePostLoginPath } from "@/lib/auth/roleRoutes";
import styles from "./auth.module.css";

function safeNextPath(raw: string | null): string | null {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginForm() {
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

      setSuccess("Đăng nhập thành công. Đang chuyển hướng…");
      router.push(resolvePostLoginPath(data.user?.role, nextPath));
      router.refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "";
      setError(message || "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="login">
      <h2 className={styles.title}>Đăng nhập</h2>
      <p className={styles.subtitle}>
        Đăng nhập bằng email hoặc tiếp tục với Google
      </p>

      {error ? (
        <div className={styles.toastStack} role="alert" aria-live="assertive">
          <div className={styles.toastError}>
            <div>
              <p className={styles.toastTitle}>Đăng nhập thất bại</p>
              <p className={styles.toastMessage}>{error}</p>
            </div>
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => setError("")}
              aria-label="Đóng thông báo"
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
            Email
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
            Mật khẩu
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
          {loading ? "Đang xử lý…" : "Đăng nhập"}
        </button>
      </form>

      <div className={styles.divider}>hoặc</div>
      <GoogleButton nextPath={nextPath} />

      <p className={styles.helperText}>
        Chưa có tài khoản?{" "}
        <Link href={nextPath ? `/dang-ky?next=${encodeURIComponent(nextPath)}` : "/dang-ky"}>
          Đăng ký ngay
        </Link>
      </p>
    </AuthLayout>
  );
}
