"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

type WorkDetailGalleryProps = {
  images: string[];
  title: string;
  /** Chỉ hiển thị thumbnail nhỏ; bấm để mở xem lớn. */
  compact?: boolean;
};

export default function WorkDetailGallery({
  images,
  title,
  compact = false,
}: WorkDetailGalleryProps) {
  const { t } = useTranslation();

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight" && images.length > 1) {
        setActiveIndex((i) => (i + 1) % images.length);
      }
      if (e.key === "ArrowLeft" && images.length > 1) {
        setActiveIndex((i) => (i - 1 + images.length) % images.length);
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, images.length, closeLightbox]);

  if (images.length === 0) return null;

  const heroSrc = images[activeIndex] ?? images[0];

  const lightbox = lightboxOpen ? (
    <div
      className="fw-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh minh hoạ: ${title}`}
      onClick={closeLightbox}
    >
      <button
        type="button"
        className="fw-lightbox__close"
        onClick={closeLightbox}
        aria-label={t("Đóng")}
      >
        <FaTimes aria-hidden />
      </button>
      <div className="fw-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <div className="fw-lightbox__img-wrap">
          <Image
            src={heroSrc}
            alt={title}
            width={1200}
            height={900}
            className="fw-lightbox__img"
            unoptimized
          />
        </div>
        {images.length > 1 ? (
          <div className="fw-lightbox__nav">
            <button
              type="button"
              className="fw-lightbox__nav-btn"
              onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
              aria-label={t("Ảnh trước")}
            >
              ‹
            </button>
            <span className="fw-lightbox__nav-label">
              {activeIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              className="fw-lightbox__nav-btn"
              onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
              aria-label="Ảnh sau"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="wd-gallery wd-gallery--compact">
        <p className="wd-gallery__compact-hint">{t("Nhấn ảnh để xem kích thước lớn")}</p>
        <div className="wd-gallery__thumbs" role="list" aria-label={t("Ảnh minh hoạ")}>
          {images.map((src, idx) => (
            <button
              key={src}
              type="button"
              role="listitem"
              className="wd-gallery__thumb"
              onClick={() => {
                setActiveIndex(idx);
                setLightboxOpen(true);
              }}
              aria-label={`${t("Xem ảnh")} ${idx + 1}`}
            >
              <Image src={src} alt="" fill sizes="96px" unoptimized />
            </button>
          ))}
        </div>
        {lightbox}
      </div>
    );
  }

  return (
    <div className="wd-gallery">
      <button
        type="button"
        className="wd-gallery__hero"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Xem ảnh: ${title}`}
      >
        <Image src={heroSrc} alt={title} fill sizes="(max-width: 1024px) 100vw, 720px" unoptimized />
      </button>
      {images.length > 1 ? (
        <div className="wd-gallery__thumbs" role="list" aria-label={t("Ảnh minh hoạ")}>
          {images.map((src, idx) => (
            <button
              key={src}
              type="button"
              role="listitem"
              className={`wd-gallery__thumb${idx === activeIndex ? " wd-gallery__thumb--active" : ""}`}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Ảnh ${idx + 1}`}
              aria-current={idx === activeIndex ? "true" : undefined}
            >
              <Image src={src} alt="" fill sizes="72px" unoptimized />
            </button>
          ))}
        </div>
      ) : null}

      {lightbox}
    </div>
  );
}
