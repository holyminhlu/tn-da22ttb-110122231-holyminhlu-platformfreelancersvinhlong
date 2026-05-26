"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import GoogleButton from "./GoogleButton";
import { login } from "@/lib/api/auth";
import { isFreelancerRole } from "@/hooks/useStoredUser";
import { persistAuthTokens, persistStoredUser, toStoredUser } from "@/lib/authSession";
import styles from "./auth.module.css";

export default function LoginForm() {
  const router = useRouter();
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

      setSuccess(`${data.message} (${data.user?.role ?? "user"})`);
      const destination = isFreelancerRole(data.user?.role) ? "/dashboard" : "/";
      router.push(destination);
      router.refresh();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "";
      setError(message || "Không thể kết nối máy chủ.");
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
