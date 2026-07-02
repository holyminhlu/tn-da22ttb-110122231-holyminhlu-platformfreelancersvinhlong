"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

type ServiceDescriptionModalProps = {
  description: string;
  onClose: () => void;
};

export default function ServiceDescriptionModal({
  description,
  onClose,
}: ServiceDescriptionModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="hire-fl-desc-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="hire-fl-desc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hire-fl-desc-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="hire-fl-desc-modal__head">
          <h2 id="hire-fl-desc-modal-title" className="hire-fl-desc-modal__title">
            {tUi("Mô tả dịch vụ")}
          </h2>
          <button
            type="button"
            className="hire-fl-desc-modal__close"
            onClick={onClose}
            aria-label={tUi("Đóng")}
          >
            <FaTimes aria-hidden />
          </button>
        </header>
        <div className="hire-fl-desc-modal__body">
          <p className="hire-fl-desc-modal__text">{description}</p>
        </div>
      </div>
    </div>
  );
}
