"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import GoogleButton from "./GoogleButton";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";
import styles from "./auth.module.css";

type LoginResponse = {
  message: string;
  user?: { id: string; email: string; role: string; fullName?: string | null; avatarUrl?: string | null };
  tokens?: { accessToken: string; refreshToken: string };
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

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
      const response = await fetch(apiUrl(apiPaths.auth.login, apiBaseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setError(data.message || "Đăng nhập thất bại.");
        return;
      }

      if (typeof window !== "undefined" && data.user) {
        window.localStorage.setItem(
          "vlc_current_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            fullName: data.user.fullName || "",
            avatarUrl: data.user.avatarUrl || "",
          }),
        );
        if (data.tokens?.accessToken) {
          window.localStorage.setItem("vlc_access_token", data.tokens.accessToken);
        }
        if (data.tokens?.refreshToken) {
          window.localStorage.setItem("vlc_refresh_token", data.tokens.refreshToken);
        }
      }

      setSuccess(`${data.message} (${data.user?.role ?? "user"})`);
      router.push("/");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.authSection} data-theme="light">
      <div className={styles.loginBox}>
        <p className={styles.title}>Đăng nhập</p>
        <p className={styles.subtitle}>Đăng nhập bằng email/mật khẩu hoặc Google</p>

        {error ? (
          <div className={styles.toastStack} role="alert" aria-live="assertive">
            <div className={styles.toastError}>
              <div>
                <p className={styles.toastTitle}>Đăng nhập thất bại</p>
                <p className={styles.toastMessage}>{error}</p>
              </div>
              <button type="button" className={styles.toastClose} onClick={() => setError("")} aria-label="Đóng thông báo">
                x
              </button>
            </div>
          </div>
        ) : null}

        {success ? <p className={styles.success}>{success}</p> : null}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <input required type="email" className={styles.input} placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className={styles.label}>Email</label>
          </div>
          <div className={styles.field}>
            <input
              required
              type="password"
              className={styles.input}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className={styles.label}>Mật khẩu</label>
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            <span />
            <span />
            <span />
            <span />
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <div style={{ marginTop: "1rem" }}>
          <GoogleButton />
        </div>

        <p className={styles.helperText}>
          Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay!</Link>
        </p>
      </div>
    </section>
  );
}
