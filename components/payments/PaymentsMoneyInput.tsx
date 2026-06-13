import { formatMoneyInputDigits, parseMoneyInputDigits } from "@/lib/format";

type PaymentsMoneyInputProps = {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export default function PaymentsMoneyInput({
  id,
  value,
  onChange,
  className = "",
  disabled = false,
  "aria-label": ariaLabel,
}: PaymentsMoneyInputProps) {
  return (
    <div className={`payments-money-input${className ? ` ${className}` : ""}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className="payments-money-input__field"
        value={formatMoneyInputDigits(value)}
        onChange={(e) => onChange(parseMoneyInputDigits(e.target.value))}
        disabled={disabled}
        autoComplete="off"
        aria-label={ariaLabel}
      />
      <span className="payments-money-input__suffix" aria-hidden>
        VND
      </span>
    </div>
  );
}
