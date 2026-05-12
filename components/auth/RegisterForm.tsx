"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import styles from "./auth.module.css";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type Role = "client" | "freelancer";
type RegisterResponse = { message: string };

export default function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiBaseUrl = getApiBaseUrl();

  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
  const strengthScore = Object.values(checks).filter(Boolean).length;
  const strengthClass =
    strengthScore <= 1 ? styles.weak : strengthScore <= 3 ? styles.medium : strengthScore === 4 ? styles.good : styles.strong;
  const strengthLabel =
    strengthScore <= 1 ? "Yếu" : strengthScore <= 3 ? "Trung bình" : strengthScore === 4 ? "Khá" : "Mạnh";
  const isPasswordStrong = Object.values(checks).every(Boolean);
  const showPasswordFeedback = password.length > 0 && !isPasswordStrong;

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 4500);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => router.push("/dang-nhap"), 1300);
    return () => window.clearTimeout(timer);
  }, [router, success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isPasswordStrong) {
      setError("Mật khẩu chưa đủ mạnh. Vui lòng đáp ứng đầy đủ tiêu chí.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl(apiPaths.auth.register, apiBaseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, fullName, email, password }),
      });
      const data = (await response.json()) as RegisterResponse;
      if (!response.ok) {
        setError(data.message || "Đăng ký thất bại.");
        return;
      }
      setSuccess(data.message || "Đăng ký thành công.");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.authSection} data-theme="light">
      <div className={`${styles.loginBox} ${styles.registerBox}`}>
        <p className={styles.title}>Đăng ký</p>
        <p className={styles.subtitle}>Chọn vai trò, nhập thông tin cơ bản để tạo tài khoản</p>

        {error ? (
          <div className={styles.toastStack} role="alert" aria-live="assertive">
            <div className={styles.toastError}>
              <div>
                <p className={styles.toastTitle}>Đăng ký thất bại</p>
                <p className={styles.toastMessage}>{error}</p>
              </div>
              <button type="button" className={styles.toastClose} onClick={() => setError("")} aria-label="Đóng thông báo">
                x
              </button>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className={styles.toastStack} role="status" aria-live="polite">
            <div className={styles.toastSuccess}>
              <div>
                <p className={styles.toastTitle}>Đăng ký thành công</p>
                <p className={styles.toastMessage}>{success}</p>
              </div>
              <button type="button" className={styles.toastClose} onClick={() => setSuccess("")} aria-label="Đóng thông báo">
                x
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="client">Client</option>
            <option value="freelancer">Freelancer</option>
          </select>

          <div className={styles.field}>
            <input required type="text" className={styles.input} placeholder=" " value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <label className={styles.label}>Họ và tên</label>
          </div>
          <div className={styles.field}>
            <input required type="email" className={styles.input} placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className={styles.label}>Email</label>
          </div>
          <div className={styles.field}>
            <input
              required
              minLength={8}
              type="password"
              className={styles.input}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className={styles.label}>Mật khẩu</label>
          </div>

          {showPasswordFeedback ? (
            <div className={styles.passwordMeter}>
              <div className={styles.meterTrack}>
                <div className={`${styles.meterFill} ${strengthClass}`} style={{ width: `${(strengthScore / 5) * 100}%` }} />
              </div>
              <p className={styles.meterText}>Độ mạnh mật khẩu: {strengthLabel}</p>
              <ul className={styles.requirements}>
                <li className={checks.minLength ? styles.requirementOk : styles.requirementMissing}>Ít nhất 8 ký tự</li>
                <li className={checks.hasUpper ? styles.requirementOk : styles.requirementMissing}>Có chữ in hoa (A-Z)</li>
                <li className={checks.hasLower ? styles.requirementOk : styles.requirementMissing}>Có chữ thường (a-z)</li>
                <li className={checks.hasNumber ? styles.requirementOk : styles.requirementMissing}>Có số (0-9)</li>
                <li className={checks.hasSpecial ? styles.requirementOk : styles.requirementMissing}>Có ký tự đặc biệt</li>
              </ul>
            </div>
          ) : null}

          <div className={styles.field}>
            <input
              required
              type="password"
              className={styles.input}
              placeholder=" "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <label className={styles.label}>Xác nhận mật khẩu</label>
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            <span />
            <span />
            <span />
            <span />
            {loading ? "Đang xử lý..." : "Tạo tài khoản"}
          </button>
        </form>

        <p className={styles.helperText}>
          Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link>
        </p>
      </div>
    </section>
  );
}
