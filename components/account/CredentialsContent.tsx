"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { changeEmail, changePassword, getMe } from "@/lib/api/users";
import { clearStoredSession } from "@/lib/authSession";
import {
  getPasswordChecks,
  isPasswordStrong,
  PASSWORD_RULE_LABELS,
} from "@/lib/passwordRules";
import "./credentials.css";

type DialogMode = "email" | "password" | null;

export default function CredentialsContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const pwdChecks = getPasswordChecks(newPassword);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMe();
      setEmail(data.user?.email ?? "");
    } catch {
      setEmail("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      router.replace("/dang-nhap");
      return;
    }
    void load();
  }, [load, router]);

  function openEmailDialog() {
    setError("");
    setNewEmail(email);
    setCurrentPassword("");
    setDialog("email");
  }

  function openPasswordDialog() {
    setError("");
    setCurrentPassword("");
    setNewPassword("");
    setDialog("password");
  }

  function closeDialog() {
    if (saving) return;
    setDialog(null);
    setError("");
  }

  async function handleReLogin() {
    clearStoredSession();
    router.push("/dang-nhap");
    router.refresh();
  }

  async function submitEmail() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      setError("Vui lòng nhập tên người dùng (email).");
      return;
    }
    if (!currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await changeEmail(trimmed, currentPassword);
      if (data.requireReLogin) {
        await handleReLogin();
        return;
      }
      setEmail(data.email ?? trimmed);
      closeDialog();
      void load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể đổi email.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function submitPassword() {
    if (!currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!isPasswordStrong(newPassword)) {
      setError("Mật khẩu mới chưa đáp ứng đủ tiêu chí.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await changePassword(currentPassword, newPassword);
      if (data.requireReLogin) {
        await handleReLogin();
        return;
      }
      closeDialog();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể đổi mật khẩu.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="ea-loading">Đang tải...</p>;
  }

  return (
    <div className="ea-main">
      <h1 className="ea-title">Tên đăng nhập và mật khẩu</h1>

      <section className="cred-section ea-card">
        <h2 className="cred-section__title">Tên người dùng</h2>
        <div className="cred-row">
          <div>
            <p className="cred-row__label">Tên người dùng hiện tại</p>
            <p className="cred-row__value">{email || "—"}</p>
          </div>
          <button type="button" className="cred-change-btn" onClick={openEmailDialog}>
            Thay đổi
          </button>
        </div>
      </section>

      <section className="cred-section ea-card">
        <h2 className="cred-section__title">Mật khẩu</h2>
        <p className="cred-row__hint" style={{ marginBottom: "0.75rem" }}>
          Mật khẩu của bạn đã được thiết lập
        </p>
        <div className="cred-row">
          <div>
            <p className="cred-row__label">Mật khẩu</p>
            <p className="cred-row__value cred-masked" aria-hidden>
              ••••••••
            </p>
          </div>
          <button type="button" className="cred-change-btn" onClick={openPasswordDialog}>
            Thay đổi
          </button>
        </div>
      </section>

      {dialog === "email" ? (
        <div className="ea-dialog-backdrop" role="presentation" onClick={closeDialog}>
          <div
            className="ea-dialog ea-dialog--wide"
            role="dialog"
            aria-labelledby="cred-email-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="cred-email-title">Thay đổi tên người dùng</h3>
            <p className="ea-dialog__lead">Nhập tên người dùng</p>
            <div className="ea-dialog-field">
              <label className="ea-dialog-label" htmlFor="cred-new-email">
                Email đăng nhập
              </label>
              <input
                id="cred-new-email"
                type="email"
                className="ea-dialog-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <p className="ea-dialog__lead">Vui lòng xác minh bằng mật khẩu hiện tại.</p>
            <div className="ea-dialog-field">
              <label className="ea-dialog-label" htmlFor="cred-email-pwd">
                Mật khẩu hiện tại
              </label>
              <input
                id="cred-email-pwd"
                type="password"
                className="ea-dialog-input"
                placeholder="Nhập mật khẩu"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="ea-dialog-error" role="alert">{error}</p> : null}
            <p className="ea-dialog__note">
              Lưu ý: Bạn sẽ cần đăng nhập lại sau khi cập nhật tên người dùng thành công.
            </p>
            <div className="ea-dialog-actions">
              <button type="button" className="ea-dialog-btn ea-dialog-btn--ghost" onClick={closeDialog}>
                Hủy
              </button>
              <button
                type="button"
                className="ea-dialog-btn ea-dialog-btn--primary"
                disabled={saving}
                onClick={() => void submitEmail()}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === "password" ? (
        <div className="ea-dialog-backdrop" role="presentation" onClick={closeDialog}>
          <div
            className="ea-dialog ea-dialog--wide"
            role="dialog"
            aria-labelledby="cred-pwd-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="cred-pwd-title">Thay đổi mật khẩu</h3>
            <div className="ea-dialog-field">
              <label className="ea-dialog-label" htmlFor="cred-cur-pwd">
                Nhập mật khẩu hiện tại
              </label>
              <input
                id="cred-cur-pwd"
                type="password"
                className="ea-dialog-input"
                placeholder="Nhập mật khẩu"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="ea-dialog-field">
              <label className="ea-dialog-label" htmlFor="cred-new-pwd">
                Nhập mật khẩu mới
              </label>
              <input
                id="cred-new-pwd"
                type="password"
                className="ea-dialog-input"
                placeholder="Nhập mật khẩu"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <p className="ea-dialog__lead">Mật khẩu phải chứa</p>
            <ul className="cred-pwd-rules">
              {PASSWORD_RULE_LABELS.map(({ key, label }) => (
                <li key={key} data-ok={pwdChecks[key] ? "true" : "false"}>
                  {label}
                </li>
              ))}
            </ul>
            {error ? <p className="ea-dialog-error" role="alert">{error}</p> : null}
            <p className="ea-dialog__note">
              Lưu ý: Bạn sẽ cần đăng nhập lại sau khi cập nhật mật khẩu thành công.
            </p>
            <div className="ea-dialog-actions">
              <button type="button" className="ea-dialog-btn ea-dialog-btn--ghost" onClick={closeDialog}>
                Hủy
              </button>
              <button
                type="button"
                className="ea-dialog-btn ea-dialog-btn--primary"
                disabled={saving}
                onClick={() => void submitPassword()}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
