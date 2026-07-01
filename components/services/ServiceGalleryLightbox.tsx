"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { useEffect } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

type ServiceGalleryLightboxProps = {
  open: boolean;
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export default function ServiceGalleryLightbox({
  open,
  images,
  index,
  onIndexChange,
  onClose,
}: ServiceGalleryLightboxProps) {
  const { t } = useTranslation();
  const hasMultiple = images.length > 1;
  const activeSrc = images[index] ?? images[0];

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && hasMultiple) {
        onIndexChange((index + 1) % images.length);
      }
      if (event.key === "ArrowLeft" && hasMultiple) {
        onIndexChange((index - 1 + images.length) % images.length);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, hasMultiple, images.length, index, onClose, onIndexChange]);

  if (!open || !activeSrc) return null;

  return (
    <div
      className="svc-gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t("Xem thư viện ảnh")}
      onClick={onClose}
    >
      <button type="button" className="svc-gallery-lightbox__close" onClick={onClose} aria-label={t("Đóng")}>
        <FaTimes aria-hidden />
      </button>

      <div className="svc-gallery-lightbox__content" onClick={(event) => event.stopPropagation()}>
        {hasMultiple ? (
          <button
            type="button"
            className="svc-gallery-lightbox__nav svc-gallery-lightbox__nav--prev"
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
            aria-label={t("Ảnh trước")}
          >
            <FaChevronLeft aria-hidden />
          </button>
        ) : null}

        <div className="svc-gallery-lightbox__img-wrap">
          <Image
            src={activeSrc}
            alt=""
            width={1200}
            height={900}
            className="svc-gallery-lightbox__img"
            unoptimized
          />
        </div>

        {hasMultiple ? (
          <button
            type="button"
            className="svc-gallery-lightbox__nav svc-gallery-lightbox__nav--next"
            onClick={() => onIndexChange((index + 1) % images.length)}
            aria-label={t("Ảnh sau")}
          >
            <FaChevronRight aria-hidden />
          </button>
        ) : null}
      </div>

      {hasMultiple ? (
        <p className="svc-gallery-lightbox__counter" aria-live="polite">
          {index + 1} / {images.length}
        </p>
      ) : null}
    </div>
  );
}
