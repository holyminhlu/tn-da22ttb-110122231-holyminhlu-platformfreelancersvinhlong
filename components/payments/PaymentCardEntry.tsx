"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import Cards from "react-credit-cards-2";
import { usePaymentInputs } from "react-payment-inputs";
import images from "react-payment-inputs/images";
import type { Focused } from "react-credit-cards-2";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import {
  formatCardholderName,
  isValidCardNumber,
  normalizeCardExpiryInput,
  parseCardDigits,
  parseCardExpiry,
} from "@/lib/payments/cardInputFormat";
import "react-credit-cards-2/dist/es/styles-compiled.css";

export type PaymentCardEntryHandle = {
  getValues: () => {
    cardDigits: string;
    expiry: string;
    cvv: string;
    cardholderName: string;
  };
  validate: () => string | null;
};

type PaymentCardEntryProps = {
  mode: "intl" | "domestic";
  cardholderName: string;
  onCardholderNameChange: (value: string) => void;
};

function readCardFieldValues(preview: { number: string; expiry: string; cvc: string }) {
  if (typeof document === "undefined") {
    return {
      cardDigits: parseCardDigits(preview.number),
      expiry: preview.expiry,
      cvv: preview.cvc.replace(/\D/g, ""),
    };
  }

  const cardNumberEl = document.getElementById("cardNumber") as HTMLInputElement | null;
  const expiryEl = document.getElementById("expiryDate") as HTMLInputElement | null;
  const cvcEl = document.getElementById("cvc") as HTMLInputElement | null;

  return {
    cardDigits: parseCardDigits(cardNumberEl?.value ?? preview.number),
    expiry: expiryEl?.value ?? preview.expiry,
    cvv: (cvcEl?.value ?? preview.cvc).replace(/\D/g, ""),
  };
}

const FOCUS_MAP: Record<string, Focused> = {
  cardNumber: "number",
  expiryDate: "expiry",
  cvc: "cvc",
  name: "name",
};

const PaymentCardEntry = forwardRef<PaymentCardEntryHandle, PaymentCardEntryProps>(
  function PaymentCardEntry({ mode, cardholderName, onCardholderNameChange }, ref) {
    const [preview, setPreview] = useState({
      number: "",
      expiry: "",
      cvc: "",
    });
    const [nameFocus, setNameFocus] = useState(false);
    const [showCvv, setShowCvv] = useState(false);

    const { meta, getCardNumberProps, getExpiryDateProps, getCVCProps, getCardImageProps } =
      usePaymentInputs();

    const cardFocus: Focused =
      nameFocus ? "name" : FOCUS_MAP[meta.focused ?? ""] ?? "";

    const syncNumber = useCallback((value: string) => {
      setPreview((prev) => ({ ...prev, number: value }));
    }, []);

    const syncExpiry = useCallback((value: string) => {
      setPreview((prev) => ({ ...prev, expiry: value }));
    }, []);

    const syncCvc = useCallback((value: string) => {
      setPreview((prev) => ({ ...prev, cvc: value }));
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => {
          const values = readCardFieldValues(preview);
          return {
            cardDigits: values.cardDigits,
            expiry: values.expiry,
            cvv: values.cvv,
            cardholderName: cardholderName.trim(),
          };
        },
        validate: () => {
          const values = readCardFieldValues(preview);
          const cardDigits = values.cardDigits;
          if (mode === "intl") {
            if (!isValidCardNumber(cardDigits)) {
              return "Số thẻ không hợp lệ.";
            }
            if (cardholderName.trim().length < 2) return "Vui lòng nhập tên in trên thẻ.";
            const expiryValue = normalizeCardExpiryInput(values.expiry) ?? values.expiry;
            if (!parseCardExpiry(expiryValue)) {
              return "Ngày hết hạn không hợp lệ (MM/YY).";
            }
            const cvvDigits = values.cvv;
            if (cvvDigits.length < 3 || cvvDigits.length > 4) {
              return "Mã CVV phải có 3–4 chữ số.";
            }
            return null;
          }

          if (cardDigits.length < 16 || cardDigits.length > 19) {
            return "Số thẻ ATM nội địa phải có 16–19 chữ số.";
          }
          if (cardholderName.trim().length < 2) return "Vui lòng nhập tên chủ thẻ.";
          return null;
        },
      }),
      [cardholderName, mode, preview],
    );

    const cardNumberProps = getCardNumberProps({
      onChange: (event) => syncNumber(event.target.value),
    });
    const expiryProps = getExpiryDateProps({
      onChange: (event) => syncExpiry(event.target.value),
    });
    const cvcProps = getCVCProps({
      onChange: (event) => syncCvc(event.target.value),
    });

    return (
      <div className="pay-method-modal__card-entry">
        <div className="pay-method-modal__card-preview">
          <Cards
            number={preview.number}
            expiry={normalizeCardExpiryInput(preview.expiry) ?? preview.expiry}
            cvc={preview.cvc}
            name={cardholderName || "TEN CHU THE"}
            focused={cardFocus}
            locale={{ valid: "thru" }}
            placeholders={{ name: "TEN CHU THE" }}
          />
        </div>

        <label className="pay-method-modal__field">
          <span className="pay-method-modal__label">
            {mode === "intl" ? "Số thẻ" : "Số thẻ ATM"}
          </span>
          <div className="pay-method-modal__input-wrap">
            <input
              {...cardNumberProps}
              className="pay-method-modal__input pay-method-modal__input--card"
              placeholder={mode === "intl" ? "4123 4567 8901 2345" : "9704 0000 0000 0000"}
            />
            <svg
              {...getCardImageProps({ images })}
              className="pay-method-modal__card-type-icon"
              aria-hidden
            />
          </div>
        </label>

        <label className="pay-method-modal__field">
          <span className="pay-method-modal__label">
            {mode === "intl" ? "Tên in trên thẻ" : "Tên chủ thẻ"}
          </span>
          <input
            className="pay-method-modal__input"
            name="name"
            autoComplete="cc-name"
            placeholder="NGUYEN VAN A"
            value={cardholderName}
            onChange={(e) => onCardholderNameChange(formatCardholderName(e.target.value))}
            onFocus={() => setNameFocus(true)}
            onBlur={() => setNameFocus(false)}
          />
        </label>

        {mode === "intl" ? (
          <div className="pay-method-modal__row-2">
            <label className="pay-method-modal__field">
              <span className="pay-method-modal__label">Ngày hết hạn</span>
              <input
                {...expiryProps}
                className="pay-method-modal__input"
                placeholder="MM/YY"
              />
            </label>

            <label className="pay-method-modal__field">
              <span className="pay-method-modal__label-row">
                <span className="pay-method-modal__label">Mã bảo mật (CVV)</span>
                <span className="pay-method-modal__cvv-help">
                  <button
                    type="button"
                    className="pay-method-modal__cvv-help-btn"
                    aria-label="CVV là gì?"
                  >
                    ?
                  </button>
                  <span className="pay-method-modal__cvv-help-pop" role="tooltip">
                    CVV là 3 số ở mặt sau thẻ (hoặc 4 số với Amex). Không lưu trên hệ thống.
                  </span>
                </span>
              </span>
              <div className="pay-method-modal__cvv-wrap">
                <input
                  {...cvcProps}
                  className="pay-method-modal__input"
                  type={showCvv ? "text" : "password"}
                  placeholder="•••"
                />
                <button
                  type="button"
                  className="pay-method-modal__cvv-toggle"
                  aria-label={showCvv ? "Ẩn CVV" : "Hiện CVV"}
                  onClick={() => setShowCvv((prev) => !prev)}
                >
                  {showCvv ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>
          </div>
        ) : null}
      </div>
    );
  },
);

export default PaymentCardEntry;
