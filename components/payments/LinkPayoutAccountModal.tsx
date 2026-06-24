"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FaIdCard, FaLock, FaUniversity } from "react-icons/fa";
import type { FreelancerPayoutProfile } from "@/lib/api/payments";
import { DOMESTIC_BANKS, maskAccountNumber } from "@/lib/payments/bankDisplay";
import BankBadgeIcon from "./BankBadgeIcon";
import "./payment-method-modal.css";

type LinkPayoutAccountModalProps = {
  open: boolean;
  profile: FreelancerPayoutProfile;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onSave: (payload: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  }) => Promise<unknown>;
};

export default function LinkPayoutAccountModal({
  open,
  profile,
  onClose,
  onSaved,
  onSave,
}: LinkPayoutAccountModalProps) {
  const { t } = useTranslation();

  const [bankName, setBankName] = useState<string>(DOMESTIC_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setBankName(profile.bankName || DOMESTIC_BANKS[0]);
    setAccountNumber("");
    setAccountHolderName(profile.accountHolderName || profile.contactName || "");
    setError("");
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  const previewMasked = useMemo(() => {
    const digits = accountNumber.replace(/\D/g, "");
    if (digits.length >= 4) return maskAccountNumber(digits);
    if (profile.isConfigured && !digits) {
      return profile.accountMasked || maskAccountNumber("", profile.accountLast4);
    }
    return "•••• •••• ••••";
  }, [accountNumber, profile]);

  const verifiedName =
    profile.accountHolderName?.trim() || profile.contactName?.trim() || "";

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
  event.preventDefault();
    setError("");
    const holder = accountHolderName.trim();
    const number = accountNumber.replace(/\D/g, "");
    if (!holder) {
      setError(t("Tên chủ tài khoản là bắt buộc."));
      return;
    }
    if (number.length < 6) {
      setError(t("Số tài khoản phải có ít nhất 6 chữ số."));
      return;
    }
    setSaving(true);
    try {
      await onSave({ bankName, accountNumber: number, accountHolderName: holder });
      await onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu tài khoản ngân hàng.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const title = profile.isConfigured
    ? "Thay đổi tài khoản ngân hàng"
    : "Liên kết tài khoản ngân hàng";

  return (
    <div className="pay-method-modal__backdrop" role="presentation">
      <form
        className="pay-method-modal pay-method-modal--payout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-payout-title"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <header className="pay-method-modal__header">
          <h2 id="link-payout-title" className="pay-method-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="pay-method-modal__close"
            aria-label={t("Đóng")}
            disabled={saving}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="pay-method-modal__body">
          <div className="pay-method-modal__payout-preview" aria-hidden>
            <BankBadgeIcon bankName={bankName} size={52} className="pay-method-modal__payout-badge" />
            <div className="pay-method-modal__payout-preview-text">
              <p className="pay-method-modal__payout-preview-bank">{bankName}</p>
              <p className="pay-method-modal__payout-preview-num">{previewMasked}</p>
              <p className="pay-method-modal__payout-preview-holder">
                {accountHolderName.trim() || "Tên chủ tài khoản"}
              </p>
            </div>
            <FaUniversity className="pay-method-modal__payout-preview-watermark" aria-hidden />
          </div>

          <p className="pay-method-modal__payout-lead">
            {t("Nhập tài khoản ngân hàng nội địa để nhận tiền rút từ ví VLC. Thông tin được mã hóa và chỉ dùng cho giải ngân.")}
          </p>

          <fieldset className="pay-method-modal__field">
            <legend className="pay-method-modal__label">{t("Chọn ngân hàng")}</legend>
            <div className="pay-method-modal__bank-options">
              {DOMESTIC_BANKS.map((bank) => {
                const active = bankName === bank;
                return (
                  <label
                    key={bank}
                    className={`pay-method-modal__bank-opt${active ? " pay-method-modal__bank-opt--active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payout-bank"
                      className="pay-method-modal__wallet-radio"
                      checked={active}
                      onChange={() => setBankName(bank)}
                    />
                    <BankBadgeIcon bankName={bank} size={36} />
                    <span>{bank}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="pay-method-modal__field">
            <span className="pay-method-modal__label">{t("Tên chủ tài khoản")}</span>
            <input
              className="pay-method-modal__input pay-method-modal__input--account"
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder={t("VD: NGUYEN VAN A (như in trên thẻ ngân hàng)")}
              autoComplete="name"
            />
            {verifiedName ? (
              <span className="pay-method-modal__field-hint">
                {t("Tên đã xác minh:")} <strong>{verifiedName}</strong> {t("— có thể nhập IN HOA, không dấu.")}
              </span>
            ) : (
              <span className="pay-method-modal__field-hint">
                {t("Nhập đúng họ tên như trên thẻ ngân hàng (IN HOA, không dấu vẫn được).")}
              </span>
            )}
          </label>

          <label className="pay-method-modal__field">
            <span className="pay-method-modal__label">{t("Số tài khoản")}</span>
            <input
              className="pay-method-modal__input pay-method-modal__input--account"
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={profile.isConfigured ? "Nhập số tài khoản mới" : "0123456789"}
              autoComplete="off"
            />
            {profile.isConfigured ? (
              <span className="pay-method-modal__field-hint">
                Hiện tại: {profile.accountMasked || maskAccountNumber("", profile.accountLast4)}
              </span>
            ) : null}
          </label>

          <p className="pay-method-modal__notice">
            <FaIdCard className="pay-method-modal__notice-icon" aria-hidden />
            <span>
              {t("Tên trên thẻ ngân hàng thường viết IN HOA, không dấu (vd: NGUYEN VAN A) — khác cách ghi trên CCCD (Nguyễn Văn A) vẫn được chấp nhận nếu cùng một người. Hệ thống so khớp tự động, bỏ qua hoa/thường và dấu tiếng Việt.")}
            </span>
          </p>

          {profile.contactEmail ? (
            <p className="pay-method-modal__email-ref">
              {t("Email đối chiếu:")} <strong>{profile.contactEmail}</strong>
            </p>
          ) : null}

          <p className="pay-method-modal__trust">
            <FaLock className="pay-method-modal__trust-icon" aria-hidden />
            <span>
              {t("Số tài khoản được lưu an toàn trên hệ thống. Khi hiển thị, chỉ các số cuối được tiết lộ. Tiền rút sẽ chuyển vào tài khoản này trong 24–48 giờ làm việc.")}
            </span>
          </p>

          {error ? (
            <p className="pay-method-modal__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="pay-method-modal__footer">
          <button
            type="button"
            className="payments-btn payments-btn--secondary"
            disabled={saving}
            onClick={onClose}
          >
            {t("Hủy")}
          </button>
          <button type="submit" className="payments-btn payments-btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : profile.isConfigured ? "Cập nhật tài khoản" : "Liên kết ngay"}
          </button>
        </footer>
      </form>
    </div>
  );
}
