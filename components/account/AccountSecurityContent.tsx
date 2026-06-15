"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import GoogleLogo from "@/components/icons/GoogleLogo";
import {
  FaBell,
  FaCheck,
  FaDesktop,
  FaExclamationCircle,
  FaFingerprint,
  FaHistory,
  FaKey,
  FaLink,
  FaMobileAlt,
  FaShieldAlt,
  FaSignOutAlt,
  FaSms,
  FaTrashAlt,
  FaUserLock,
  FaUserSlash,
} from "react-icons/fa";
import {
  deactivateAccount,
  deleteAccount,
  getSecurityOverview,
  listLoginHistory,
  listSecuritySessions,
  revokeOtherSecuritySessions,
  revokeSecuritySession,
  updateRecoverySettings,
  type LoginHistoryEntry,
  type SecurityOverview,
  type SecuritySession,
} from "@/lib/api/security";
import { clearStoredSession } from "@/lib/authSession";
import "./account-security.css";

type DangerAction = "deactivate" | "delete" | null;

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionIcon({ deviceType }: { deviceType: string }) {
  if (deviceType === "mobile" || deviceType === "tablet") {
    return <FaMobileAlt aria-hidden />;
  }
  return <FaDesktop aria-hidden />;
}

export default function AccountSecurityContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [sessionBusy, setSessionBusy] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [dangerPassword, setDangerPassword] = useState("");
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerError, setDangerError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [ov, sess, hist] = await Promise.all([
        getSecurityOverview(),
        listSecuritySessions(),
        listLoginHistory(25),
      ]);
      setOverview(ov);
      setSessions(sess.items);
      setHistory(hist.items);
      setRecoveryEmail(ov.recovery.recoveryEmail ?? "");
      setRecoveryPhone(ov.recovery.recoveryPhone ?? "");
      setLoginAlerts(ov.auth.loginAlertsEnabled);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải cài đặt bảo mật.";
      setErrorMessage(message);
      setOverview(null);
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
    void loadAll();
  }, [loadAll, router]);

  async function handleSaveRecovery() {
    setSavingRecovery(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const data = await updateRecoverySettings({
        recoveryEmail: recoveryEmail.trim(),
        recoveryPhone: recoveryPhone.trim(),
        loginAlertsEnabled: loginAlerts,
      });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              recovery: data.recovery,
              auth: { ...prev.auth, loginAlertsEnabled: data.auth.loginAlertsEnabled },
            }
          : prev,
      );
      setSuccessMessage(data.message ?? "Đã cập nhật thông tin khôi phục.");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu thay đổi.";
      setErrorMessage(message);
    } finally {
      setSavingRecovery(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setSessionBusy(sessionId);
    setErrorMessage("");
    try {
      const data = await revokeSecuritySession(sessionId);
      setSuccessMessage(data.message);
      const sess = await listSecuritySessions();
      setSessions(sess.items);
      if (overview) {
        setOverview({ ...overview, activeSessions: sess.items.length });
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể đăng xuất thiết bị.";
      setErrorMessage(message);
    } finally {
      setSessionBusy(null);
    }
  }

  async function handleRevokeOthers() {
    setSessionBusy("others");
    setErrorMessage("");
    try {
      const data = await revokeOtherSecuritySessions();
      setSuccessMessage(data.message);
      const sess = await listSecuritySessions();
      setSessions(sess.items);
      if (overview) {
        setOverview({ ...overview, activeSessions: sess.items.length });
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể đăng xuất các thiết bị khác.";
      setErrorMessage(message);
    } finally {
      setSessionBusy(null);
    }
  }

  function openDanger(action: DangerAction) {
    setDangerAction(action);
    setDangerPassword("");
    setDangerConfirm("");
    setDangerError("");
  }

  function closeDanger() {
    if (dangerBusy) return;
    setDangerAction(null);
    setDangerError("");
  }

  async function submitDanger() {
    if (!dangerAction) return;
    const expected = dangerAction === "deactivate" ? "DEACTIVATE" : "DELETE";
    if (dangerConfirm !== expected) {
      setDangerError(`Nhập chính xác "${expected}" để xác nhận.`);
      return;
    }

    const needsPassword = overview && (!overview.auth.isGoogleAccount || overview.auth.hasLocalPassword);
    if (needsPassword && !dangerPassword) {
      setDangerError("Vui lòng nhập mật khẩu để xác nhận.");
      return;
    }

    setDangerBusy(true);
    setDangerError("");
    try {
      const payload = {
        confirm: dangerConfirm,
        ...(needsPassword ? { currentPassword: dangerPassword } : {}),
      };
      const data =
        dangerAction === "deactivate"
          ? await deactivateAccount(payload)
          : await deleteAccount(payload);

      if (data.requireLogout) {
        clearStoredSession();
        router.push("/dang-nhap");
        router.refresh();
        return;
      }

      setSuccessMessage(data.message);
      closeDanger();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể hoàn tất yêu cầu.";
      setDangerError(message);
    } finally {
      setDangerBusy(false);
    }
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);
  const googleLinked = overview?.linkedAccounts.find((a) => a.provider === "google");

  if (loading) {
    return (
      <div className="ea-main sec-panel">
        <div className="sec-panel__loading">
          <span className="sec-panel__spinner" aria-hidden />
          <p>Đang tải cài đặt bảo mật...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ea-main sec-panel">
      <header className="sec-panel__header">
        <div className="sec-panel__header-icon" aria-hidden>
          <FaShieldAlt />
        </div>
        <div>
          <h1 className="sec-panel__title">Bảo mật tài khoản</h1>
          <p className="sec-panel__subtitle">
            Quản lý xác thực, phiên đăng nhập, thông tin khôi phục và quyền riêng tư của bạn trên
            Vĩnh Long Connected.
          </p>
        </div>
      </header>

      {successMessage ? (
        <p className="sec-banner sec-banner--success" role="status">
          <FaCheck aria-hidden />
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="sec-banner sec-banner--error" role="alert">
          <FaExclamationCircle aria-hidden />
          {errorMessage}
        </p>
      ) : null}

      {/* Xác thực nâng cao */}
      <section className="sec-section" aria-labelledby="sec-auth-heading">
        <div className="sec-section__head">
          <div>
            <h2 id="sec-auth-heading" className="sec-section__title">
              Xác thực nâng cao
            </h2>
          </div>
        </div>
        <div className="sec-feature-grid">
          <article className="sec-feature">
            <h3 className="sec-feature__title">
              <span>
                <FaKey aria-hidden /> Xác thực hai yếu tố (2FA)
              </span>
              <span className="sec-badge sec-badge--soon">Sắp ra mắt</span>
            </h3>
            <p className="sec-feature__desc">
              Ứng dụng tạo mã (Google Authenticator, Authy), OTP qua SMS/Email và mã dự phòng dùng một
              lần.
            </p>
          </article>
          <article className="sec-feature">
            <h3 className="sec-feature__title">
              <span>
                <FaFingerprint aria-hidden /> Passkey (WebAuthn)
              </span>
              <span className="sec-badge sec-badge--soon">Sắp ra mắt</span>
            </h3>
            <p className="sec-feature__desc">
              Đăng nhập bằng vân tay hoặc khuôn mặt trên thiết bị — không cần nhập mật khẩu mỗi lần.
            </p>
          </article>
        </div>
        {overview?.auth.isGoogleOnly ? (
          <p className="sec-banner sec-banner--info" style={{ marginTop: "0.75rem" }}>
            <GoogleLogo className="sec-google-logo" size={18} />
            Bạn đang dùng Google SSO. Hãy{" "}
            <Link href="/edit-account/ten-dang-nhap">tạo mật khẩu VLC</Link> để tăng cường bảo mật
            trước khi bật 2FA.
          </p>
        ) : null}
      </section>

      <div className="sec-dual-grid">
      {/* Phiên đăng nhập */}
      <section className="sec-section" aria-labelledby="sec-sessions-heading">
        <div className="sec-section__head">
          <div>
            <h2 id="sec-sessions-heading" className="sec-section__title">
              Phiên đăng nhập
            </h2>
          </div>
          {otherSessions.length > 0 ? (
            <div className="sec-section__actions">
              <button
                type="button"
                className="sec-btn sec-btn--ghost"
                disabled={sessionBusy !== null}
                onClick={() => void handleRevokeOthers()}
              >
                <FaSignOutAlt aria-hidden />
                {sessionBusy === "others" ? "Đang xử lý..." : "Đăng xuất thiết bị khác"}
              </button>
            </div>
          ) : null}
        </div>
        <div className="sec-card">
          {sessions.length === 0 ? (
            <p className="sec-empty">Không có phiên đăng nhập đang hoạt động.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="sec-row">
                <div className="sec-row__main">
                  <div className="sec-row__icon sec-row__icon--device">
                    <SessionIcon deviceType={session.deviceType} />
                  </div>
                  <div>
                    <p className="sec-row__label">{session.deviceLabel}</p>
                    <p className="sec-row__meta">
                      {session.ipAddress ? `IP: ${session.ipAddress}` : "IP không xác định"}
                      {" · "}
                      Đăng nhập {formatDateTime(session.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="sec-row__aside">
                  {session.isCurrent ? (
                    <span className="sec-badge sec-badge--current">Phiên hiện tại</span>
                  ) : (
                    <button
                      type="button"
                      className="sec-btn sec-btn--ghost"
                      disabled={sessionBusy !== null}
                      onClick={() => void handleRevokeSession(session.id)}
                    >
                      {sessionBusy === session.id ? "..." : "Đăng xuất"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Lịch sử đăng nhập */}
      <section className="sec-section" aria-labelledby="sec-history-heading">
        <div className="sec-section__head">
          <div>
            <h2 id="sec-history-heading" className="sec-section__title">
              Lịch sử đăng nhập
            </h2>
          </div>
        </div>
        <div className="sec-card">
          {history.length === 0 ? (
            <p className="sec-empty">Chưa có lịch sử đăng nhập.</p>
          ) : (
            <ul className="sec-history-list">
              {history.map((entry) => (
                <li key={`${entry.success ? "ok" : "fail"}-${entry.id}-${entry.at}`} className="sec-history-item">
                  <div className="sec-row__main">
                    <div className="sec-row__icon">
                      <FaHistory aria-hidden />
                    </div>
                    <div>
                      <p className="sec-row__label">{entry.deviceLabel}</p>
                      <p className="sec-row__meta">
                        {formatDateTime(entry.at)}
                        {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`sec-badge ${entry.success ? "sec-badge--success" : "sec-badge--fail"}`}
                  >
                    {entry.success ? "Thành công" : "Thất bại"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>

      <div className="sec-dual-grid">
      {/* Khôi phục & Cảnh báo */}
      <section className="sec-section" aria-labelledby="sec-recovery-heading">
        <div className="sec-section__head">
          <div>
            <h2 id="sec-recovery-heading" className="sec-section__title">
              Khôi phục &amp; cảnh báo
            </h2>
          </div>
        </div>
        <div className="sec-card">
          <div className="sec-form-grid">
            <div className="sec-field">
              <label htmlFor="sec-login-email">Email đăng nhập</label>
              <input
                id="sec-login-email"
                type="email"
                value={overview?.recovery.loginEmail ?? ""}
                readOnly
                disabled
              />
              <p className="sec-field__hint">Quản lý tại mục Tên đăng nhập &amp; Mật khẩu.</p>
            </div>
            <div className="sec-field">
              <label htmlFor="sec-profile-phone">SĐT hồ sơ</label>
              <input
                id="sec-profile-phone"
                type="tel"
                value={overview?.recovery.profilePhone ?? ""}
                readOnly
                disabled
                placeholder="Chưa cập nhật"
              />
            </div>
            <div className="sec-field">
              <label htmlFor="sec-recovery-email">Email khôi phục</label>
              <input
                id="sec-recovery-email"
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="email-khoi-phuc@example.com"
                autoComplete="email"
              />
            </div>
            <div className="sec-field">
              <label htmlFor="sec-recovery-phone">SĐT khôi phục</label>
              <input
                id="sec-recovery-phone"
                type="tel"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                autoComplete="tel"
              />
            </div>
          </div>
          <div className="sec-toggle">
            <div>
              <p className="sec-row__label">
                <FaBell aria-hidden /> Cảnh báo đăng nhập bất thường
              </p>
              <p className="sec-row__meta">
                Gửi thông báo khi phát hiện đăng nhập từ IP hoặc thiết bị mới.
              </p>
            </div>
            <button
              type="button"
              className="sec-toggle__switch"
              role="switch"
              aria-checked={loginAlerts}
              aria-label="Bật cảnh báo đăng nhập bất thường"
              onClick={() => setLoginAlerts((v) => !v)}
            />
          </div>
          <div className="sec-row" style={{ borderTop: "1px solid #f3f4f6" }}>
            <p className="sec-row__meta" style={{ margin: 0 }}>
              <FaSms aria-hidden /> OTP qua SMS sẽ khả dụng cùng tính năng 2FA.
            </p>
            <button
              type="button"
              className="sec-btn sec-btn--primary"
              disabled={savingRecovery}
              onClick={() => void handleSaveRecovery()}
            >
              {savingRecovery ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </section>

      {/* Tài khoản liên kết */}
      <section className="sec-section" aria-labelledby="sec-linked-heading">
        <div className="sec-section__head">
          <div>
            <h2 id="sec-linked-heading" className="sec-section__title">
              Tài khoản liên kết
            </h2>
          </div>
        </div>
        <div className="sec-card">
          <div className="sec-row">
            <div className="sec-row__main">
              <div className="sec-row__icon sec-row__icon--google">
                <GoogleLogo className="sec-google-logo" size={20} />
              </div>
              <div>
                <p className="sec-row__label">Google</p>
                <p className="sec-row__meta">
                  {googleLinked?.linked
                    ? googleLinked.email ?? overview?.recovery.loginEmail
                    : "Chưa liên kết"}
                </p>
              </div>
            </div>
            <div className="sec-row__aside">
              {googleLinked?.linked ? (
                <span className="sec-badge sec-badge--linked">
                  <FaLink aria-hidden /> Đã liên kết
                </span>
              ) : (
                <span className="sec-badge sec-badge--soon">Chưa liên kết</span>
              )}
            </div>
          </div>
          <div className="sec-row sec-card--muted">
            <p className="sec-row__meta" style={{ margin: 0 }}>
              Facebook, Apple và Zalo sẽ được bổ sung trong các phiên bản tiếp theo.
            </p>
          </div>
        </div>
      </section>
      </div>

      {/* Vùng nguy hiểm */}
      <section className="sec-section sec-danger-zone" aria-labelledby="sec-danger-heading">
        <div className="sec-section__head">
          <div>
            <h2 id="sec-danger-heading" className="sec-section__title">
              Quyền riêng tư &amp; tài khoản
            </h2>
          </div>
        </div>
        <div className="sec-card sec-danger-zone">
          <div className="sec-row">
            <div className="sec-row__main">
              <div className="sec-row__icon">
                <FaUserSlash aria-hidden />
              </div>
              <div>
                <p className="sec-row__label">Tạm khóa tài khoản</p>
                <p className="sec-row__meta">
                  Vô hiệu hóa đăng nhập và đăng xuất mọi phiên. Liên hệ hỗ trợ để kích hoạt lại.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="sec-btn sec-btn--danger"
              onClick={() => openDanger("deactivate")}
            >
              Tạm khóa
            </button>
          </div>
          <div className="sec-row">
            <div className="sec-row__main">
              <div className="sec-row__icon">
                <FaTrashAlt aria-hidden />
              </div>
              <div>
                <p className="sec-row__label">Xóa tài khoản vĩnh viễn</p>
                <p className="sec-row__meta">
                  Xóa dữ liệu cá nhân theo quy định bảo vệ dữ liệu. Không thể hoàn tác.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="sec-btn sec-btn--danger-solid"
              onClick={() => openDanger("delete")}
            >
              Xóa tài khoản
            </button>
          </div>
        </div>
      </section>

      {dangerAction ? (
        <div className="sec-modal-backdrop" role="presentation" onClick={closeDanger}>
          <div
            className="sec-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sec-danger-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sec-modal__header">
              <h3
                id="sec-danger-modal-title"
                className={`sec-modal__title${dangerAction === "delete" ? " sec-modal__title--danger" : ""}`}
              >
                {dangerAction === "deactivate" ? "Tạm khóa tài khoản" : "Xóa tài khoản vĩnh viễn"}
              </h3>
              <p className="sec-modal__text">
                {dangerAction === "deactivate"
                  ? "Tài khoản sẽ không thể đăng nhập cho đến khi được kích hoạt lại bởi hỗ trợ."
                  : "Toàn bộ dữ liệu cá nhân sẽ bị ẩn danh hóa. Hành động này không thể hoàn tác."}
              </p>
            </div>
            <div className="sec-modal__body">
              {overview && (overview.auth.isGoogleAccount === false || overview.auth.hasLocalPassword) ? (
                <div className="sec-field">
                  <label htmlFor="sec-danger-pwd">
                    <FaUserLock aria-hidden /> Mật khẩu hiện tại
                  </label>
                  <input
                    id="sec-danger-pwd"
                    type="password"
                    value={dangerPassword}
                    onChange={(e) => setDangerPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              ) : null}
              <div className="sec-field">
                <label htmlFor="sec-danger-confirm">
                  Nhập <strong>{dangerAction === "deactivate" ? "DEACTIVATE" : "DELETE"}</strong> để
                  xác nhận
                </label>
                <input
                  id="sec-danger-confirm"
                  type="text"
                  className="sec-modal__confirm-input"
                  value={dangerConfirm}
                  onChange={(e) => setDangerConfirm(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              {dangerError ? (
                <p className="sec-modal__error" role="alert">
                  <FaExclamationCircle aria-hidden />
                  {dangerError}
                </p>
              ) : null}
            </div>
            <div className="sec-modal__footer">
              <button
                type="button"
                className="sec-btn sec-btn--ghost"
                onClick={closeDanger}
                disabled={dangerBusy}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`sec-btn ${dangerAction === "delete" ? "sec-btn--danger-solid" : "sec-btn--danger"}`}
                disabled={dangerBusy}
                onClick={() => void submitDanger()}
              >
                {dangerBusy
                  ? "Đang xử lý..."
                  : dangerAction === "deactivate"
                    ? "Xác nhận tạm khóa"
                    : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
