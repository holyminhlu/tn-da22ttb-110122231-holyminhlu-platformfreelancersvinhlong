"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FaGoogle, FaKey, FaLock, FaShieldAlt } from "react-icons/fa";
import {
  getWithdrawalPinSettings,
  saveWithdrawalPinSettings,
  type FreelancerWithdrawalPinStatus,
} from "@/lib/api/payments";
import PinInput from "@/components/payments/PinInput";
import "./withdrawal-pin-settings.css";

export default function WithdrawalPinSettings() {
  const { t } = useTranslation();

  const [status, setStatus] = useState<FreelancerWithdrawalPinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWithdrawalPinSettings();
      setStatus(data.withdrawalPin);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải cài đặt PIN.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    if (window.location.hash !== "#withdrawal-pin") return;
    document.getElementById("withdrawal-pin")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (pin.length !== 6 || confirmPin.length !== 6) {
      setError("Mã PIN phải gồm đúng 6 chữ số.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Mã PIN xác nhận không khớp.");
      return;
    }

    setSaving(true);
    try {
      const data = await saveWithdrawalPinSettings({
        pin,
        confirmPin,
        currentPassword: currentPassword || undefined,
        newPassword: status?.requiresAppPasswordSetup ? newPassword : undefined,
        confirmNewPassword: status?.requiresAppPasswordSetup ? confirmNewPassword : undefined,
      });
      setMessage(data.message);
      setStatus(data.withdrawalPin);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPin("");
      setConfirmPin("");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu PIN rút tiền.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="wdp-loading">Đang tải cài đặt PIN rút tiền...</p>;
  }

  const googleSetup = Boolean(status?.requiresAppPasswordSetup);

  return (
    <section id="withdrawal-pin" className="ea-card as-card wdp-card">
      <h2 className="as-section-title">
        <FaShieldAlt className="mr-2 inline text-[#2563eb]" aria-hidden />
        Mã PIN rút tiền
      </h2>
      <p className="as-section-desc">
        PIN 6 số dùng để xác nhận mỗi lệnh rút tiền về ngân hàng. Không chia sẻ PIN với bất kỳ ai.
      </p>

      {status?.isConfigured ? (
        <p className="wdp-status wdp-status--ok" role="status">
          Đã thiết lập PIN rút tiền. Bạn có thể đổi PIN bên dưới (cần mật khẩu đăng nhập).
        </p>
      ) : (
        <p className="wdp-status wdp-status--warn" role="status">
          Chưa thiết lập PIN — bạn cần tạo PIN trước khi rút tiền.
        </p>
      )}

      {googleSetup ? (
        <div className="wdp-google-note" role="note">
          <FaGoogle aria-hidden />
          <div>
            <p className="wdp-google-note__title">Tài khoản đăng nhập Google</p>
            <p className="wdp-google-note__text">
              Bạn không dùng mật khẩu VLC để đăng nhập. Hãy đặt{" "}
              <strong>mật khẩu ứng dụng</strong> (riêng cho xác nhận giao dịch, khác tài khoản Google)
              cùng lúc với mã PIN. Sau này đổi PIN vẫn cần mật khẩu ứng dụng này.
            </p>
          </div>
        </div>
      ) : (
        <div className="wdp-google-note wdp-google-note--plain" role="note">
          <FaKey aria-hidden />
          <p className="wdp-google-note__text">
            {status?.isConfigured
              ? "Nhập mật khẩu đăng nhập hiện tại để đổi PIN."
              : "Nhập mật khẩu đăng nhập để xác minh trước khi tạo PIN."}
          </p>
        </div>
      )}

      <form className="wdp-form" onSubmit={(e) => void handleSubmit(e)}>
        {googleSetup ? (
          <>
            <label className="wdp-label" htmlFor="wdp-new-password">
              Mật khẩu ứng dụng (mới)
            </label>
            <input
              id="wdp-new-password"
              type="password"
              className="wdp-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={saving}
              placeholder="Tối thiểu 8 ký tự, hoa/thường/số/ký tự đặc biệt"
            />
            <label className="wdp-label" htmlFor="wdp-confirm-new-password">
              Xác nhận mật khẩu ứng dụng
            </label>
            <input
              id="wdp-confirm-new-password"
              type="password"
              className="wdp-input"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={saving}
            />
          </>
        ) : (
          <>
            <label className="wdp-label" htmlFor="wdp-current-password">
              <FaLock aria-hidden /> Mật khẩu đăng nhập
            </label>
            <input
              id="wdp-current-password"
              type="password"
              className="wdp-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={saving}
            />
          </>
        )}

        <label className="wdp-label">Mã PIN mới (6 chữ số)</label>
        <PinInput id="wdp-pin" value={pin} onChange={setPin} disabled={saving} autoFocus />

        <label className="wdp-label">Nhập lại PIN</label>
        <PinInput id="wdp-pin-confirm" value={confirmPin} onChange={setConfirmPin} disabled={saving} />

        {error ? (
          <p className="wdp-error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="wdp-success" role="status">
            {message}
          </p>
        ) : null}

        <div className="wdp-actions">
          <button type="submit" className="payments-btn payments-btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : status?.isConfigured ? "Cập nhật PIN" : "Thiết lập PIN"}
          </button>
        </div>
      </form>

      <p className="wdp-footnote">
        Quản lý email/mật khẩu đăng nhập tại{" "}
        <Link href="/edit-account/ten-dang-nhap">Tên đăng nhập và mật khẩu</Link>.
      </p>
    </section>
  );
}
