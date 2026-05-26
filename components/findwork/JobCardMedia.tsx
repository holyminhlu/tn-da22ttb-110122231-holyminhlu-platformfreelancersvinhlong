"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

type JobCardMediaProps = {
  images: string[];
  title: string;
};

export default function JobCardMedia({ images, title }: JobCardMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const previewSrc = images[0];
  const lightboxSrc = images[activeIndex] ?? previewSrc;

  return (
    <>
      <div className="fw-card__media">
        <button
          type="button"
          className="fw-card__media-frame"
          onClick={() => {
            setActiveIndex(0);
            setLightboxOpen(true);
          }}
          aria-label={`Xem ảnh công việc: ${title}`}
        >
          <Image
            src={previewSrc}
            alt={title}
            fill
            className="fw-card__media-img"
            sizes="280px"
            unoptimized
          />
          <span className="fw-card__media-hint" aria-hidden>
            Phóng to
          </span>
        </button>
        {images.length > 1 ? (
          <p className="fw-card__media-count">{images.length} ảnh — bấm để xem</p>
        ) : null}
      </div>

      {lightboxOpen ? (
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
            aria-label="Đóng"
          >
            <FaTimes aria-hidden />
          </button>
          <div className="fw-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <div className="fw-lightbox__img-wrap">
              <Image
                src={lightboxSrc}
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
                  aria-label="Ảnh trước"
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
      ) : null}
    </>
  );
}
