"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useRef, useState } from "react";
import { FaLock } from "react-icons/fa";
import { addBillingMethod } from "@/lib/api/payments";
import { parseCardExpiry } from "@/lib/payments/cardInputFormat";
import PaymentCardEntry, { type PaymentCardEntryHandle } from "@/components/payments/PaymentCardEntry";
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

export default function AddPaymentMethodModal({
  onClose, onSaved }: AddPaymentMethodModalProps) {
  const { t } = useTranslation();

  const [tab, setTab] = useState<MethodTab>("intl_card");
  const [cardholderName, setCardholderName] = useState("");
  const [bankName, setBankName] = useState<string>(DOMESTIC_BANKS[0]);
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
    const entry = cardEntryRef.current;
    if (!entry) return t("Không tải được form thẻ. Vui lòng thử lại.");
    return entry.validate();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (tab === "ewallet") return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const values = cardEntryRef.current?.getValues();
      if (!values) throw new Error(t("Không đọc được thông tin thẻ."));
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
    if (next === "ewallet") return;
    setTab(next);
    setError("");
  }

  return (
    <div className="pay-method-modal__backdrop" role="presentation">
      <form
        className="pay-method-modal pay-method-modal--with-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-method-modal-title"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <header className="pay-method-modal__header">
          <h2 id="pay-method-modal-title" className="pay-method-modal__title">
            {t("Thêm phương thức thanh toán mới")}
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
          <div className="pay-method-modal__tabs" role="tablist" aria-label={t("Loại phương thức")}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "intl_card"}
              className={`pay-method-modal__tab${tab === "intl_card" ? " pay-method-modal__tab--active" : ""}`}
              onClick={() => handleTabChange("intl_card")}
            >
              {t("Thẻ Tín dụng / Ghi nợ")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "domestic_atm"}
              className={`pay-method-modal__tab${tab === "domestic_atm" ? " pay-method-modal__tab--active" : ""}`}
              onClick={() => handleTabChange("domestic_atm")}
            >
              {t("Thẻ ATM nội địa")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={false}
              aria-disabled="true"
              disabled
              className="pay-method-modal__tab pay-method-modal__tab--disabled"
              title={t("Đang phát triển")}
            >
              <span>{t("Ví điện tử")}</span>
              <span className="pay-method-modal__tab-badge">{t("Đang phát triển")}</span>
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
                <span className="pay-method-modal__label">{t("Ngân hàng")}</span>
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
            <p className="pay-method-modal__coming-soon" role="status">
              {t("Tính năng ví điện tử đang được phát triển. Vui lòng chọn thẻ tín dụng hoặc thẻ ATM nội địa.")}
            </p>
          ) : null}

          {tab !== "ewallet" ? (
            <label className="pay-method-modal__check">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>{t("Đặt làm phương thức thanh toán mặc định")}</span>
          </label>
          ) : null}

          <p className="pay-method-modal__trust">
            <FaLock className="pay-method-modal__trust-icon" aria-hidden />
            <span>
              {t("Thông tin thẻ của bạn được mã hóa và bảo mật an toàn chuẩn quốc tế (PCI DSS). Chúng tôi chỉ lưu 4 số cuối — không lưu CVV.")}
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
          <button type="submit" className="payments-btn payments-btn--primary" disabled={saving || tab === "ewallet"}>
            {saving ? t("Đang lưu...") : t("Thêm thẻ ngay")}
          </button>
        </footer>
      </form>
    </div>
  );
}
