"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaCreditCard, FaLock, FaSpinner } from "react-icons/fa";
import {
  addCreditCard,
  createCardVerifyPaymentLink,
  getCardVerifyPaymentStatus,
  type IdentityVerificationResponse,
} from "@/lib/api/identityVerification";
import { formatVnd } from "@/lib/format";

const VERIFY_AMOUNT = 10_000;

type CreditCardVerifyPanelProps = {
  data: IdentityVerificationResponse;
  onSaved: () => void;
  /** Poll trạng thái payOS sau khi quay lại từ cổng thanh toán */
  pendingOrderCode?: number | null;
  onPaymentPollComplete?: () => void;
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

export default function CreditCardVerifyPanel({
  data,
  onSaved,
  pendingOrderCode,
  onPaymentPollComplete,
}: CreditCardVerifyPanelProps) {
  const v = data.verification;
  const cardAdded = Boolean(v?.card_added_at);
  const cardVerified = Boolean(v?.card_verified_at);

  const [view, setView] = useState<ViewMode>(cardAdded && !cardVerified ? "wizard" : "intro");
  const [wizardStep, setWizardStep] = useState<WizardStep>(cardAdded ? "verify" : "add");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [polling, setPolling] = useState(false);

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
      setMessage(
        result.message ??
          "Đã lưu thẻ. Chuyển sang bước xác minh số tiền — thanh toán 10.000 VND qua payOS.",
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

  async function handlePayWithPayos() {
    setSaving(true);
    setMessage("");
    try {
      const result = await createCardVerifyPaymentLink();
      if (!result.checkoutUrl) {
        setMessage("Không nhận được link thanh toán payOS.");
        return;
      }
      window.location.href = result.checkoutUrl;
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tạo link thanh toán.";
      setMessage(msg);
      setSaving(false);
    }
  }

  // Poll payOS khi quay lại từ cổng thanh toán
  useEffect(() => {
    if (!pendingOrderCode || cardVerified) return;

    let stopped = false;
    setPolling(true);
    setView("wizard");
    setWizardStep("verify");
    setMessage("Đang xác nhận thanh toán với payOS…");

    void (async () => {
      for (let i = 0; i < 30 && !stopped; i += 1) {
        try {
          const status = await getCardVerifyPaymentStatus(pendingOrderCode);
          if (status.status === "SUCCESS") {
            setMessage(
              `Thanh toán thành công. ${formatVnd(status.amount)} đã được cộng vào số dư ví. Bước xác minh thẻ đã hoàn tất.`,
            );
            onSaved();
            onPaymentPollComplete?.();
            setPolling(false);
            return;
          }
          if (status.status === "CANCELLED") {
            setMessage("Thanh toán đã bị hủy. Bạn có thể thử lại.");
            onPaymentPollComplete?.();
            setPolling(false);
            return;
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => window.setTimeout(r, 2000));
      }
      if (!stopped) {
        setMessage(
          "Chưa nhận được xác nhận từ payOS. Nếu đã chuyển khoản, vui lòng đợi thêm hoặc bấm Thanh toán lại.",
        );
        onPaymentPollComplete?.();
        setPolling(false);
      }
    })();

    return () => {
      stopped = true;
    };
  }, [pendingOrderCode, cardVerified, onSaved, onPaymentPollComplete]);

  if (view === "intro") {
    return (
      <div className="idv-cc">
        <p className="idv-intro" style={{ marginBottom: "1.5rem" }}>
          Thêm thẻ và thanh toán {formatVnd(VERIFY_AMOUNT)} qua payOS để xác minh. Số tiền này sẽ
          trở thành số dư đầu tiên trong ví của bạn.
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
              Nhập thông tin thẻ tín dụng / ghi nợ liên kết.
            </p>
          </button>
          <button
            type="button"
            className="idv-cc-action-card"
            onClick={() => startWizard("verify")}
            disabled={!cardAdded}
          >
            <FaLock className="idv-cc-action-card__icon" aria-hidden />
            <h3 className="idv-cc-action-card__title">Xác minh số tiền</h3>
            <p className="idv-cc-action-card__desc">
              Thanh toán {formatVnd(VERIFY_AMOUNT)} qua payOS để hoàn tất xác minh thẻ.
            </p>
          </button>
        </div>

        {cardAdded && maskedCard ? (
          <p className="idv-msg idv-msg--ok" style={{ marginTop: "1rem" }}>
            Thẻ đã thêm: {maskedCard}
            {cardVerified ? " — Đã xác minh." : " — Chưa xác minh số tiền."}
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
            Sau khi thêm thẻ, bạn sẽ thanh toán {formatVnd(VERIFY_AMOUNT)} qua payOS ở bước tiếp
            theo. Số tiền này được cộng vào số dư ví và hoàn tất xác minh thẻ.{" "}
            <Link href="/help">Tìm hiểu thêm</Link>
          </p>

          {message ? (
            <p
              className={`idv-msg${message.includes("thành công") || message.includes("Đã lưu") || message.includes("Chuyển sang") ? " idv-msg--ok" : ""}`}
            >
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
            Thanh toán <strong>{formatVnd(VERIFY_AMOUNT)}</strong> qua payOS để xác minh thẻ tín
            dụng. Số tiền sẽ được cộng vào số dư ví của bạn ngay sau khi thanh toán thành công.
            {maskedCard ? ` Thẻ: ${maskedCard}.` : null}
          </p>

          {cardVerified ? (
            <p className="idv-msg idv-msg--ok">
              Đã xác minh thẻ tín dụng thành công. Số dư ví đã được cập nhật.
            </p>
          ) : null}

          {message ? (
            <p
              className={`idv-msg${message.includes("thành công") || message.includes("hoàn tất") ? " idv-msg--ok" : ""}`}
              role="status"
            >
              {polling ? (
                <>
                  <FaSpinner className="inline animate-spin mr-2" aria-hidden />
                  {message}
                </>
              ) : (
                message
              )}
            </p>
          ) : null}

          <div className="idv-detail__actions idv-detail__actions--row">
            <button type="button" className="idv-btn idv-btn--ghost" onClick={() => setView("intro")}>
              Quay lại
            </button>
            <button
              type="button"
              className="idv-btn idv-btn--primary"
              disabled={saving || polling || cardVerified}
              onClick={() => void handlePayWithPayos()}
            >
              {cardVerified
                ? "Đã xác minh"
                : saving
                  ? "Đang chuyển payOS…"
                  : `Thanh toán ${formatVnd(VERIFY_AMOUNT)} qua payOS`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
