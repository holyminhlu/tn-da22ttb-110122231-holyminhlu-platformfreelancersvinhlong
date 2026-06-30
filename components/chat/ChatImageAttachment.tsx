"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import "./chat-lightbox.css";

type ChatImageAttachmentProps = {
  src: string;
  alt: string;
  imageClassName?: string;
  buttonClassName?: string;
};

export default function ChatImageAttachment({
  src,
  alt,
  imageClassName,
  buttonClassName,
}: ChatImageAttachmentProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const lightbox =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="vlc-chat-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={close}
          >
            <button
              type="button"
              className="vlc-chat-lightbox__close"
              onClick={close}
              aria-label="Đóng"
            >
              <FaTimes aria-hidden />
            </button>
            <div className="vlc-chat-lightbox__content" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="vlc-chat-lightbox__img" />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen(true)}
        aria-label={`Xem ảnh: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={imageClassName} />
      </button>
      {lightbox}
    </>
  );
}
