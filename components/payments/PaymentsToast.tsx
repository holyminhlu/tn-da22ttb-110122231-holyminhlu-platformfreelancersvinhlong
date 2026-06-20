"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useEffect } from "react";

type PaymentsToastProps = {
  message: string;
  variant?: "success" | "error";
  onClose: () => void;
  durationMs?: number;
};

export default function PaymentsToast({
  message,
  variant = "success",
  onClose,
  durationMs = 3000,
}: PaymentsToastProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onClose]);

  return (
    <div className="payments-toast-stack" role="status" aria-live="polite">
      <div
        className={`payments-toast payments-toast--${variant}`}
      >
        <p className="payments-toast__message">{message}</p>
        <button
          type="button"
          className="payments-toast__close"
          aria-label={t("Đóng thông báo")}
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );
}
