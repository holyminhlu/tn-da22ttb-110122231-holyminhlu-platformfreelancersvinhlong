"use client";

import { useEffect, useRef, useState } from "react";
import { FaLock } from "react-icons/fa";
import { addBillingMethod } from "@/lib/api/payments";
import { parseCardExpiry } from "@/lib/payments/cardInputFormat";
import PaymentCardEntry, { type PaymentCardEntryHandle } from "@/components/payments/PaymentCardEntry";
import WalletBrandIcon, { walletBrandLabel } from "@/components/payments/WalletBrandIcon";
import "./payment-method-modal.css";

type MethodTab = "intl_card" | "domestic_atm" | "ewallet";

const DOMESTIC_BANKS = [
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
  "Sacombank",
  "TPBank",
] as const;

type AddPaymentMethodModalProps = {
  onClose: () => void;
  onSaved: () => void;
};

export default function AddPaymentMethodModal({ onClose, onSaved }: AddPaymentMethodModalProps) {
  const [tab, setTab] = useState<MethodTab>("intl_card");
  const [cardholderName, setCardholderName] = useState("");
  const [bankName, setBankName] = useState<string>(DOMESTIC_BANKS[0]);
  const [walletProvider, setWalletProvider] = useState<"momo" | "zalopay">("momo");
  const [walletPhone, setWalletPhone] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const cardEntryRef = useRef<PaymentCardEntryHandle>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  function validate(): string | null {
    if (tab === "intl_card" || tab === "domestic_atm") {
      const entry = cardEntryRef.current;
      if (!entry) return "Không tải được form thẻ. Vui lòng thử lại.";
      return entry.validate();
    }

    const phone = walletPhone.replace(/\D/g, "");
    if (phone.length < 9 || phone.length > 11) {
      return "Số điện thoại ví không hợp lệ.";
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (tab === "ewallet") {
        await addBillingMethod({
          variant: tab,
          cardNumber: "",
          walletProvider,
          walletPhone: walletPhone.replace(/\D/g, ""),
          isDefault,
        });
      } else {
        const values = cardEntryRef.current?.getValues();
        if (!values) throw new Error("Không đọc được thông tin thẻ.");
        const parsedExpiry = parseCardExpiry(values.expiry);
        await addBillingMethod({
          variant: tab,
          cardNumber: values.cardDigits,
          cardholderName: values.cardholderName,
          expMonth: parsedExpiry?.month,
          expYear: parsedExpiry?.year,
          bankName: tab === "domestic_atm" ? bankName : undefined,
          isDefault,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu phương thức thanh toán.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function handleTabChange(next: MethodTab) {
    setTab(next);
    setError("");
    if (next === "ewallet") setCardholderName("");
  }

  return (
    <div
      className="pay-method-modal__backdrop"
      role="presentation"
      onClick={() => !saving && onClose()}
    >
      <form
        className="pay-method-modal pay-method-modal--with-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-method-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <header className="pay-method-modal__header">
          <h2 id="pay-method-modal-title" className="pay-method-modal__title">
            Thêm phương thức thanh toán mới
          </h2>
          <button
            type="button"
            className="pay-method-modal__close"
            aria-label="Đóng"
            disabled={saving}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="pay-method-modal__body">
          <div className="pay-method-modal__tabs" role="tablist" aria-label="Loại phương thức">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "intl_card"}
              className={`pay-method-modal__tab${tab === "intl_card" ? " pay-method-modal__tab--active" : ""}`}
              onClick={() => handleTabChange("intl_card")}
            >
              Thẻ Tín dụng / Ghi nợ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "domestic_atm"}
              className={`pay-method-modal__tab${tab === "domestic_atm" ? " pay-method-modal__tab--active" : ""}`}
              onClick={() => handleTabChange("domestic_atm")}
            >
              Thẻ ATM nội địa
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "ewallet"}
              className={`pay-method-modal__tab${tab === "ewallet" ? " pay-method-modal__tab--active" : ""}`}
              onClick={() => handleTabChange("ewallet")}
            >
              Ví điện tử
            </button>
          </div>

          {tab === "intl_card" ? (
            <PaymentCardEntry
              key="intl"
              ref={cardEntryRef}
              mode="intl"
              cardholderName={cardholderName}
              onCardholderNameChange={setCardholderName}
            />
          ) : null}

          {tab === "domestic_atm" ? (
            <>
              <label className="pay-method-modal__field">
                <span className="pay-method-modal__label">Ngân hàng</span>
                <select
                  className="pay-method-modal__select"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  {DOMESTIC_BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </label>
              <PaymentCardEntry
                key="domestic"
                ref={cardEntryRef}
                mode="domestic"
                cardholderName={cardholderName}
                onCardholderNameChange={setCardholderName}
              />
            </>
          ) : null}

          {tab === "ewallet" ? (
            <>
              <fieldset className="pay-method-modal__field">
                <legend className="pay-method-modal__label">Chọn ví</legend>
                <div className="pay-method-modal__wallet-options">
                  <label
                    className={`pay-method-modal__wallet-opt${walletProvider === "momo" ? " pay-method-modal__wallet-opt--active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="wallet"
                      className="pay-method-modal__wallet-radio"
                      checked={walletProvider === "momo"}
                      onChange={() => setWalletProvider("momo")}
                    />
                    <WalletBrandIcon brand="momo" size={40} className="pay-method-modal__wallet-logo" />
                    <span>{walletBrandLabel("momo")}</span>
                  </label>
                  <label
                    className={`pay-method-modal__wallet-opt${walletProvider === "zalopay" ? " pay-method-modal__wallet-opt--active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="wallet"
                      className="pay-method-modal__wallet-radio"
                      checked={walletProvider === "zalopay"}
                      onChange={() => setWalletProvider("zalopay")}
                    />
                    <WalletBrandIcon
                      brand="zalopay"
                      size={40}
                      className="pay-method-modal__wallet-logo"
                    />
                    <span>{walletBrandLabel("zalopay")}</span>
                  </label>
                </div>
              </fieldset>

              <label className="pay-method-modal__field">
                <span className="pay-method-modal__label">Số điện thoại liên kết ví</span>
                <input
                  className="pay-method-modal__input"
                  inputMode="tel"
                  placeholder="09xx xxx xxx"
                  value={walletPhone}
                  onChange={(e) => setWalletPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                />
              </label>
            </>
          ) : null}

          <label className="pay-method-modal__check">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>Đặt làm phương thức thanh toán mặc định</span>
          </label>

          <p className="pay-method-modal__trust">
            <FaLock className="pay-method-modal__trust-icon" aria-hidden />
            <span>
              Thông tin thẻ của bạn được mã hóa và bảo mật an toàn chuẩn quốc tế (PCI DSS). Chúng
              tôi chỉ lưu 4 số cuối — không lưu CVV.
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
            Hủy
          </button>
          <button type="submit" className="payments-btn payments-btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : tab === "ewallet" ? "Liên kết ví" : "Thêm thẻ ngay"}
          </button>
        </footer>
      </form>
    </div>
  );
}
