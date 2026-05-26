"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FaCreditCard, FaLock } from "react-icons/fa";
import {
  addCreditCard,
  verifyCardCharge,
  type IdentityVerificationResponse,
} from "@/lib/api/identityVerification";

type CreditCardVerifyPanelProps = {
  data: IdentityVerificationResponse;
  onSaved: () => void;
};

type WizardStep = "add" | "verify";
type ViewMode = "intro" | "wizard";

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function splitName(fullName: string | null | undefined) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.join(" ");
}

function defaultCardholder(data: IdentityVerificationResponse) {
  const v = data.verification;
  const legal = [v?.legal_first_name, v?.legal_last_name].filter(Boolean).join(" ").trim();
  return legal || splitName(data.profile.full_name) || "";
}

export default function CreditCardVerifyPanel({ data, onSaved }: CreditCardVerifyPanelProps) {
  const v = data.verification;
  const cardAdded = Boolean(v?.card_added_at);
  const cardVerified = Boolean(v?.card_verified_at);

  const [view, setView] = useState<ViewMode>("intro");
  const [wizardStep, setWizardStep] = useState<WizardStep>("add");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [chargeHint, setChargeHint] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(v?.card_expiry ?? "");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState(
    v?.cardholder_name ?? defaultCardholder(data),
  );
  const [isBusinessCard, setIsBusinessCard] = useState(v?.is_business_card ?? false);

  const [billingStreet, setBillingStreet] = useState(
    v?.billing_street ?? v?.address_street ?? data.profile.bio ?? "",
  );
  const [billingCountry, setBillingCountry] = useState(
    v?.billing_country ?? v?.address_country ?? "Vietnam",
  );
  const [billingState, setBillingState] = useState(v?.billing_state ?? v?.address_state ?? "");
  const [billingCity, setBillingCity] = useState(
    v?.billing_city ?? v?.address_city ?? data.profile.district_city ?? "",
  );
  const [billingPostal, setBillingPostal] = useState(
    v?.billing_postal ?? v?.address_postal ?? "",
  );
  const [billingPhone, setBillingPhone] = useState(
    v?.billing_phone ?? data.profile.phone ?? "",
  );
  const [billingCurrency, setBillingCurrency] = useState(
    v?.billing_currency ?? "Vietnamese Đồng",
  );

  const [chargeAmount, setChargeAmount] = useState("");

  const maskedCard = useMemo(() => {
    if (!v?.card_last4) return null;
    return `•••• •••• •••• ${v.card_last4}`;
  }, [v?.card_last4]);

  function startWizard(step: WizardStep) {
    setMessage("");
    setWizardStep(step);
    setView("wizard");
  }

  async function handleAddCard() {
    const digits = cardNumber.replace(/\D/g, "");
    if (!digits || !expiry.trim() || !cvv.trim() || !cardholderName.trim()) {
      setMessage("Vui lòng điền đầy đủ thông tin thẻ.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await addCreditCard({
        cardNumber: digits,
        expiry: expiry.trim(),
        cvv: cvv.trim(),
        cardholderName: cardholderName.trim(),
        isBusinessCard,
        billingStreet: billingStreet.trim(),
        billingCountry: billingCountry.trim(),
        billingState: billingState.trim(),
        billingCity: billingCity.trim(),
        billingPostal: billingPostal.trim(),
        billingPhone: billingPhone.trim(),
        billingCurrency: billingCurrency.trim(),
      });
      if (result.chargeAmountUsd) {
        setChargeHint(result.chargeAmountUsd);
      }
      setMessage(
        result.message ??
          `Đã trừ tạm $${result.chargeAmountUsd ?? "—"} USD. Chuyển sang bước xác minh số tiền.`,
      );
      setCvv("");
      setCardNumber("");
      setWizardStep("verify");
      onSaved();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể thêm thẻ.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyCharge() {
    if (!chargeAmount.trim()) {
      setMessage("Nhập số tiền đã thanh toán (USD).");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await verifyCardCharge(chargeAmount.trim());
      setMessage(result.message ?? "Đã xác minh thẻ thành công.");
      onSaved();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xác minh.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  if (view === "intro") {
    return (
      <div className="idv-cc">
        <p className="idv-intro" style={{ marginBottom: "1.5rem" }}>
          Thêm thẻ và xác nhận số tiền bạn bị trừ.
        </p>

        <div className="idv-cc-actions">
          <button
            type="button"
            className="idv-cc-action-card"
            onClick={() => startWizard("add")}
          >
            <FaCreditCard className="idv-cc-action-card__icon" aria-hidden />
            <h3 className="idv-cc-action-card__title">Thêm thẻ</h3>
            <p className="idv-cc-action-card__desc">
              Nhập thông tin thẻ. Một khoản phí tạm thời sẽ được trừ.
            </p>
          </button>
          <button
            type="button"
            className="idv-cc-action-card"
            onClick={() => startWizard("verify")}
            disabled={!cardAdded}
          >
            <FaLock className="idv-cc-action-card__icon" aria-hidden />
            <h3 className="idv-cc-action-card__title">Xác minh số tiền đã tính phí</h3>
            <p className="idv-cc-action-card__desc">
              Xác minh bằng cách nhập số tiền đã thanh toán.
            </p>
          </button>
        </div>

        {cardAdded && maskedCard ? (
          <p className="idv-msg idv-msg--ok" style={{ marginTop: "1rem" }}>
            Thẻ đã thêm: {maskedCard}
            {cardVerified ? " — Đã xác minh số tiền." : " — Chưa xác minh số tiền."}
          </p>
        ) : null}

        <p className="idv-cc-privacy">
          Chúng tôi cam kết bảo vệ quyền riêng tư của người dùng. Mọi thông tin được chia sẻ sẽ
          không được thêm vào hồ sơ cá nhân của bạn và chỉ được sử dụng nội bộ. Vui lòng xem{" "}
          <Link href="/help">Chính sách bảo mật</Link> của chúng tôi để biết thêm thông tin.
        </p>

        <div className="idv-footer" style={{ marginTop: "1.5rem", paddingTop: 0, borderTop: "none" }}>
          <button type="button" className="idv-start" onClick={() => startWizard("add")}>
            Bắt đầu xác minh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="idv-cc idv-cc--wizard">
      <nav className="idv-cc-wizard-nav" aria-label="Các bước thẻ tín dụng">
        <button
          type="button"
          className={`idv-cc-wizard-nav__item${wizardStep === "add" ? " idv-cc-wizard-nav__item--active" : ""}`}
          onClick={() => setWizardStep("add")}
        >
          Thêm thẻ
        </button>
        <button
          type="button"
          className={`idv-cc-wizard-nav__item${wizardStep === "verify" ? " idv-cc-wizard-nav__item--active" : ""}`}
          onClick={() => setWizardStep("verify")}
          disabled={!cardAdded}
        >
          Xác minh số tiền
        </button>
      </nav>

      {wizardStep === "add" ? (
        <form
          className="idv-cc-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleAddCard();
          }}
        >
          <h2 className="idv-detail__title">Thông tin thẻ tín dụng</h2>

          <label className="idv-field">
            <span className="idv-field__label">Số thẻ</span>
            <div className="idv-cc-card-row">
              <input
                className="idv-field__input"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="Nhập số thẻ"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              />
              <span className="idv-cc-brands" aria-hidden>
                <span className="idv-cc-brand idv-cc-brand--visa">VISA</span>
                <span className="idv-cc-brand idv-cc-brand--mc">MC</span>
              </span>
            </div>
          </label>

          <div className="idv-form-grid">
            <label className="idv-field">
              <span className="idv-field__label">Ngày hết hạn</span>
              <input
                className="idv-field__input"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                maxLength={5}
                value={expiry}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (val.length > 2) val = `${val.slice(0, 2)}/${val.slice(2)}`;
                  setExpiry(val);
                }}
              />
            </label>
            <label className="idv-field">
              <span className="idv-field__label">Mã bảo mật (CVV)</span>
              <input
                className="idv-field__input"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVV"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </label>
          </div>

          <label className="idv-field">
            <span className="idv-field__label">Tên chủ thẻ</span>
            <input
              className="idv-field__input"
              type="text"
              autoComplete="cc-name"
              placeholder="Minh Given"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
            />
          </label>

          <label className="idv-check">
            <input
              type="checkbox"
              checked={isBusinessCard}
              onChange={(e) => setIsBusinessCard(e.target.checked)}
            />
            <span>Đây là thẻ doanh nghiệp.</span>
          </label>

          <h3 className="idv-detail__subtitle">Thông tin thanh toán</h3>

          <label className="idv-field">
            <span className="idv-field__label">Đường phố</span>
            <input
              className="idv-field__input"
              value={billingStreet}
              onChange={(e) => setBillingStreet(e.target.value)}
            />
          </label>

          <div className="idv-form-grid">
            <label className="idv-field">
              <span className="idv-field__label">Quốc gia</span>
              <input
                className="idv-field__input"
                value={billingCountry}
                onChange={(e) => setBillingCountry(e.target.value)}
              />
            </label>
            <label className="idv-field">
              <span className="idv-field__label">Tình trạng</span>
              <input
                className="idv-field__input"
                value={billingState}
                onChange={(e) => setBillingState(e.target.value)}
              />
            </label>
          </div>

          <div className="idv-form-grid">
            <label className="idv-field">
              <span className="idv-field__label">Thành phố</span>
              <input
                className="idv-field__input"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
              />
            </label>
            <label className="idv-field">
              <span className="idv-field__label">Mã bưu chính</span>
              <input
                className="idv-field__input"
                value={billingPostal}
                onChange={(e) => setBillingPostal(e.target.value)}
              />
            </label>
          </div>

          <label className="idv-field">
            <span className="idv-field__label">Điện thoại</span>
            <input
              className="idv-field__input"
              type="tel"
              value={billingPhone}
              onChange={(e) => setBillingPhone(e.target.value)}
            />
          </label>

          <label className="idv-field">
            <span className="idv-field__label">Tiền tệ</span>
            <input
              className="idv-field__input"
              value={billingCurrency}
              onChange={(e) => setBillingCurrency(e.target.value)}
            />
          </label>

          <p className="idv-cc-charge-note">
            Để xác minh, chúng tôi sẽ trừ ngẫu nhiên một khoản tiền lên đến 10 đô la vào thẻ của
            bạn. Bạn cần nhập chính xác số tiền này để xác minh thẻ.{" "}
            <Link href="/help">Tìm hiểu thêm</Link>
          </p>

          {message ? (
            <p className={`idv-msg${message.includes("thành công") || message.includes("Đã trừ") || message.includes("Đã thêm") ? " idv-msg--ok" : ""}`}>
              {message}
            </p>
          ) : null}

          <div className="idv-detail__actions idv-detail__actions--row">
            <button
              type="button"
              className="idv-btn idv-btn--ghost"
              onClick={() => setView("intro")}
            >
              Quay lại
            </button>
            <button type="submit" className="idv-btn idv-btn--primary" disabled={saving}>
              {saving ? "Đang xử lý..." : "Thêm thẻ"}
            </button>
          </div>
        </form>
      ) : (
        <div className="idv-cc-form">
          <h2 className="idv-detail__title">Xác minh số tiền</h2>
          <p className="idv-detail__lead">
            Nhập chính xác số tiền (USD) đã bị trừ tạm thời trên thẻ của bạn.
            {maskedCard ? ` Thẻ: ${maskedCard}.` : null}
          </p>
          {process.env.NODE_ENV === "development" && chargeHint ? (
            <p className="idv-msg">
              Dev: số tiền vừa trừ là <strong>${chargeHint}</strong> USD.
            </p>
          ) : null}

          <label className="idv-field">
            <span className="idv-field__label">Số tiền đã thanh toán (USD)</span>
            <input
              className="idv-field__input"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
            />
          </label>

          {message ? <p className="idv-msg">{message}</p> : null}

          <div className="idv-detail__actions idv-detail__actions--row">
            <button type="button" className="idv-btn idv-btn--ghost" onClick={() => setView("intro")}>
              Quay lại
            </button>
            <button
              type="button"
              className="idv-btn idv-btn--primary"
              disabled={saving || cardVerified}
              onClick={() => void handleVerifyCharge()}
            >
              {cardVerified ? "Đã xác minh" : saving ? "Đang xác minh..." : "Xác minh số tiền"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
