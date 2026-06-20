"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";

type PinInputProps = {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
};

export default function PinInput({
  id,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  "aria-label": ariaLabel = "Mã PIN 6 số",
}: PinInputProps) {
  const { t } = useTranslation();

  const resolvedAriaLabel = ariaLabel === "Mã PIN 6 số" ? t("Mã PIN 6 số") : ariaLabel;
  const digits = value.replace(/\D/g, "").slice(0, 6).split("");
  while (digits.length < 6) digits.push("");

  function handleChange(index: number, char: string) {
  const t = tUi;
  const next = char.replace(/\D/g, "").slice(-1);
    const arr = value.replace(/\D/g, "").slice(0, 6).split("");
    while (arr.length < 6) arr.push("");
    arr[index] = next;
    onChange(arr.join("").replace(/\D/g, "").slice(0, 6));
  }

  function handleKeyDown(index: number, key: string) {
  const t = tUi;
    if (key === "Backspace" && !digits[index] && index > 0) {
      const el = document.getElementById(`${id}-${index - 1}`);
      el?.focus();
    }
  }

  function handlePaste(text: string) {
  const t = tUi;
    const pasted = text.replace(/\D/g, "").slice(0, 6);
    if (pasted) onChange(pasted);
  }

  return (
    <div className="pin-input" role="group" aria-label={resolvedAriaLabel}>
      {digits.map((digit, index) => (
        <input
          key={index}
          id={`${id}-${index}`}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          className="pin-input__cell"
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`${resolvedAriaLabel}, ${t("chữ số")} ${index + 1}`}
          onChange={(e) => {
            handleChange(index, e.target.value);
            if (e.target.value.replace(/\D/g, "") && index < 5) {
              document.getElementById(`${id}-${index + 1}`)?.focus();
            }
          }}
          onKeyDown={(e) => handleKeyDown(index, e.key)}
          onPaste={(e) => {
            e.preventDefault();
            handlePaste(e.clipboardData.getData("text"));
          }}
        />
      ))}
    </div>
  );
}
