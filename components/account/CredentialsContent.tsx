"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import GoogleLogo from "@/components/icons/GoogleLogo";
import {
  FaCheck,
  FaEnvelope,
  FaExclamationCircle,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import {
  changeEmail,
  changePassword,
  getCredentials,
  setPassword,
  type CredentialsMeta,
} from "@/lib/api/users";
import { clearStoredSession } from "@/lib/authSession";
import {
  getPasswordChecks,
  isPasswordStrong,
  PASSWORD_RULE_LABELS,
} from "@/lib/passwordRules";
import "./credentials.css";

type DialogMode = "email" | "password" | null;
type PasswordMode = "set" | "change";

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = getPasswordChecks(password);
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.values(checks).length;
  const ratio = total > 0 ? passed / total : 0;
  const level = ratio === 0 ? "empty" : ratio < 0.5 ? "weak" : ratio < 1 ? "medium" : "strong";
  const label =
    level === "empty"
      ? "Chưa nhập"
      : level === "weak"
        ? "Yếu"
        : level === "medium"
          ? "Trung bình"
          : "Mạnh";

  return (
    <div className="cred-strength">
      <div className="cred-strength__track" aria-hidden>
        <span className={`cred-strength__fill cred-strength__fill--${level}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className={`cred-strength__label cred-strength__label--${level}`}>{label}</span>
    </div>
  );
}

function PasswordToggleInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="cred-modal__field">
      <label className="cred-modal__label" htmlFor={id}>
        {label}
      </label>
      <div className="cred-modal__input-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="cred-modal__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="cred-modal__toggle-pwd"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? <FaEyeSlash aria-hidden /> : <FaEye aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export default function CredentialsContent() {
  const { t } = useTranslation();

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [auth, setAuth] = useState<Pick<CredentialsMeta, "isGoogleAccount" | "hasLocalPassword" | "isGoogleOnly">>({
    isGoogleAccount: false,
    hasLocalPassword: false,
    isGoogleOnly: false,
  });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("change");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const pwdChecks = getPasswordChecks(newPassword);
  const pwdReady = isPasswordStrong(newPassword);
  const pwdPassedCount = useMemo(() => Object.values(pwdChecks).filter(Boolean).length, [pwdChecks]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCredentials();
      setEmail(data.email ?? "");
      setAuth({
        isGoogleAccount: data.isGoogleAccount,
        hasLocalPassword: data.hasLocalPassword,
        isGoogleOnly: data.isGoogleOnly,
      });
    } catch {
      setEmail("");
      setAuth({ isGoogleAccount: false, hasLocalPassword: false, isGoogleOnly: false });
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

  function openPasswordDialog(mode: PasswordMode) {
    setError("");
    setCurrentPassword("");
    setNewPassword("");
    setPasswordMode(mode);
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
    if (passwordMode === "change" && !currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!pwdReady) {
      setError("Mật khẩu mới chưa đáp ứng đủ tiêu chí.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data =
        passwordMode === "set"
          ? await setPassword(newPassword)
          : await changePassword(currentPassword, newPassword);

      if (data.requireReLogin) {
        await handleReLogin();
        return;
      }

      if (passwordMode === "set") {
        setAuth((prev) => ({
          ...prev,
          hasLocalPassword: true,
          isGoogleOnly: false,
        }));
        setSuccessMessage(
          data.message ??
            "Đã tạo mật khẩu VLC. Bạn có thể đăng nhập bằng Google hoặc email/mật khẩu.",
        );
      }

      closeDialog();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : passwordMode === "set"
            ? "Không thể tạo mật khẩu."
            : "Không thể đổi mật khẩu.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const passwordDialogTitle = passwordMode === "set" ? "Tạo mật khẩu VLC" : "Đổi mật khẩu";
  const passwordDialogSub =
    passwordMode === "set"
      ? "Sau khi tạo, bạn có thể đăng nhập bằng Google hoặc email/mật khẩu VLC."
      : "Tạo mật khẩu mạnh để bảo vệ tài khoản.";

  if (loading) {
    return (
      <div className="ea-main cred-panel">
        <div className="cred-panel__loading">
          <span className="cred-panel__spinner" aria-hidden />
          <p>Đang tải thông tin đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ea-main cred-panel">
      <header className="cred-panel__header">
        <div className="cred-panel__header-icon" aria-hidden>
          <FaKey />
        </div>
        <div>
          <h1 className="cred-panel__title">Tên đăng nhập và mật khẩu</h1>
          <p className="cred-panel__subtitle">
            {auth.isGoogleAccount
              ? "Tài khoản liên kết Google — quản lý email và mật khẩu theo chính sách đăng nhập một lần (SSO)."
              : "Quản lý email đăng nhập và mật khẩu để bảo vệ tài khoản của bạn."}
          </p>
        </div>
      </header>

      {successMessage ? (
        <p className="cred-success" role="status">
          <FaCheck aria-hidden />
          {successMessage}
        </p>
      ) : null}

      <div className="cred-panel__cards">
        <article className="cred-card">
          <div className="cred-card__top">
            <div className="cred-card__icon cred-card__icon--email">
              <FaEnvelope aria-hidden />
            </div>
            <div className="cred-card__meta">
              <h2 className="cred-card__title">Tên người dùng</h2>
              <p className="cred-card__desc">
                {auth.isGoogleAccount
                  ? "Địa chỉ Gmail dùng khi đăng nhập với Google và nhận thông báo hệ thống."
                  : "Email dùng để đăng nhập và nhận thông báo hệ thống."}
              </p>
            </div>
          </div>
          <div className="cred-card__field">
            <span className="cred-card__label">Email hiện tại</span>
            <div className="cred-card__value-box">
              {auth.isGoogleAccount ? (
                <GoogleLogo className="cred-google-logo cred-card__value-icon--google" size={16} />
              ) : (
                <FaUser className="cred-card__value-icon" aria-hidden />
              )}
              <span className="cred-card__value">{email || "—"}</span>
              {auth.isGoogleAccount ? (
                <span className="cred-google-badge">Google</span>
              ) : null}
            </div>
          </div>
          {auth.isGoogleAccount ? (
            <div className="cred-google-note" role="note">
              <GoogleLogo className="cred-google-logo" size={18} />
              <p className="cred-google-note__text">
                Email được quản lý qua tài khoản Google và không thể đổi tại đây. Đăng nhập vẫn dùng nút
                &quot;Đăng nhập với Google&quot;.
              </p>
            </div>
          ) : (
            <button type="button" className="cred-card__btn" onClick={openEmailDialog}>
              Thay đổi email
            </button>
          )}
        </article>

        <article className="cred-card">
          <div className="cred-card__top">
            <div className="cred-card__icon cred-card__icon--password">
              <FaLock aria-hidden />
            </div>
            <div className="cred-card__meta">
              <h2 className="cred-card__title">Mật khẩu</h2>
              <p className="cred-card__desc">
                {auth.isGoogleOnly
                  ? "Mật khẩu đăng nhập Google do Google quản lý. VLC không lưu mật khẩu Google của bạn."
                  : auth.isGoogleAccount && auth.hasLocalPassword
                    ? "Đã thiết lập mật khẩu VLC. Bạn có thể đăng nhập bằng Google hoặc email/mật khẩu."
                    : "Mật khẩu đã được thiết lập. Nên đổi định kỳ và không chia sẻ với người khác."}
              </p>
            </div>
          </div>
          <div className="cred-card__field">
            <span className="cred-card__label">
              {auth.isGoogleOnly ? "Mật khẩu VLC" : "Mật khẩu hiện tại"}
            </span>
            <div
              className={`cred-card__value-box${auth.isGoogleOnly ? " cred-card__value-box--unset" : " cred-card__value-box--masked"}`}
            >
              <FaLock className="cred-card__value-icon" aria-hidden />
              {auth.isGoogleOnly ? (
                <span className="cred-card__value cred-card__value--muted">Chưa thiết lập</span>
              ) : (
                <>
                  <span className="cred-card__value cred-card__masked" aria-hidden>
                    ••••••••••••
                  </span>
                  <span className="sr-only">Đã thiết lập</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            className="cred-card__btn"
            onClick={() => openPasswordDialog(auth.isGoogleOnly ? "set" : "change")}
          >
            {auth.isGoogleOnly ? "Tạo mật khẩu" : "Đổi mật khẩu"}
          </button>
        </article>
      </div>

      <aside className="cred-tip">
        <div className="cred-tip__icon" aria-hidden>
          <FaShieldAlt />
        </div>
        <div>
          <p className="cred-tip__title">Mẹo bảo mật</p>
          <p className="cred-tip__text">
            {auth.isGoogleAccount
              ? "Giữ bảo mật tài khoản Google của bạn. Nếu tạo mật khẩu VLC, hãy dùng mật khẩu riêng — không trùng với Gmail."
              : "Dùng mật khẩu riêng cho VL Connected, bật xác minh email và không chia sẻ thông tin đăng nhập qua tin nhắn hoặc cuộc gọi lạ."}
          </p>
        </div>
      </aside>

      {dialog ? (
        <div className="cred-modal-backdrop" role="presentation">
          <div
            className="cred-modal"
            role="dialog"
            aria-labelledby={dialog === "email" ? "cred-email-title" : "cred-pwd-title"}
          >
            <div className="cred-modal__header">
              <div className="cred-modal__header-main">
                <div
                  className={`cred-modal__header-icon${dialog === "email" ? " cred-modal__header-icon--email" : " cred-modal__header-icon--password"}`}
                  aria-hidden
                >
                  {dialog === "email" ? <FaEnvelope /> : <FaLock />}
                </div>
                <div>
                  <h3 id={dialog === "email" ? "cred-email-title" : "cred-pwd-title"}>
                    {dialog === "email" ? "Thay đổi email đăng nhập" : passwordDialogTitle}
                  </h3>
                  <p className="cred-modal__header-sub">
                    {dialog === "email"
                      ? "Email mới sẽ dùng cho lần đăng nhập tiếp theo."
                      : passwordDialogSub}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cred-modal__close"
                onClick={closeDialog}
                disabled={saving}
                aria-label="Đóng"
              >
                <FaTimes aria-hidden />
              </button>
            </div>

            <div className="cred-modal__body">
              {dialog === "email" ? (
                <>
                  <div className="cred-modal__current">
                    <span className="cred-modal__current-label">Email hiện tại</span>
                    <span className="cred-modal__current-value">{email || "—"}</span>
                  </div>
                  <div className="cred-modal__field">
                    <label className="cred-modal__label" htmlFor="cred-new-email">
                      Email mới
                    </label>
                    <input
                      id="cred-new-email"
                      type="email"
                      className="cred-modal__input"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="ten@email.com"
                      autoComplete="username"
                    />
                  </div>
                  <PasswordToggleInput
                    id="cred-email-pwd"
                    label="Mật khẩu hiện tại"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="Xác minh danh tính"
                    autoComplete="current-password"
                  />
                </>
              ) : (
                <>
                  {passwordMode === "change" ? (
                    <PasswordToggleInput
                      id="cred-cur-pwd"
                      label="Mật khẩu hiện tại"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      placeholder="Nhập mật khẩu hiện tại"
                      autoComplete="current-password"
                    />
                  ) : (
                    <div className="cred-google-note cred-google-note--compact" role="note">
                      <GoogleLogo className="cred-google-logo" size={18} />
                      <p className="cred-google-note__text">
                        Bạn đang đăng nhập qua Google. Tạo mật khẩu VLC để có thể đăng nhập thêm bằng
                        email/mật khẩu — liên kết Google vẫn giữ nguyên.
                      </p>
                    </div>
                  )}
                  <PasswordToggleInput
                    id="cred-new-pwd"
                    label={passwordMode === "set" ? "Mật khẩu VLC mới" : "Mật khẩu mới"}
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Nhập mật khẩu mới"
                    autoComplete="new-password"
                  />
                  <PasswordStrengthBar password={newPassword} />
                  <div className="cred-modal__rules">
                    <p className="cred-modal__rules-title">
                      Tiêu chí mật khẩu ({pwdPassedCount}/{PASSWORD_RULE_LABELS.length})
                    </p>
                    <ul className="cred-pwd-rules">
                      {PASSWORD_RULE_LABELS.map(({ key, label }) => (
                        <li key={key} data-ok={pwdChecks[key] ? "true" : "false"}>
                          <span className="cred-pwd-rules__mark" aria-hidden>
                            {pwdChecks[key] ? <FaCheck /> : null}
                          </span>
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {error ? (
                <p className="cred-modal__error" role="alert">
                  <FaExclamationCircle aria-hidden />
                  {error}
                </p>
              ) : null}

              <p className="cred-modal__note">
                {dialog === "password" && passwordMode === "set"
                  ? "Sau khi tạo mật khẩu, bạn không cần đăng nhập lại phiên hiện tại."
                  : "Sau khi cập nhật thành công, bạn sẽ cần đăng nhập lại bằng thông tin mới."}
              </p>
            </div>

            <div className="cred-modal__footer">
              <button
                type="button"
                className="cred-modal__btn cred-modal__btn--ghost"
                onClick={closeDialog}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cred-modal__btn cred-modal__btn--primary"
                disabled={saving || (dialog === "password" && !pwdReady && Boolean(newPassword))}
                onClick={() => void (dialog === "email" ? submitEmail() : submitPassword())}
              >
                {saving
                  ? "Đang lưu..."
                  : dialog === "password" && passwordMode === "set"
                    ? "Tạo mật khẩu"
                    : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
