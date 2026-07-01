"use client";

import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { resolveFreelancerMedia } from "@/lib/hire/freelancerSearchDisplay";

type ServiceDemoModalProps = {
  open: boolean;
  onClose: () => void;
  url: string;
  kind?: string;
};

function detectDemoType(kind: string, url: string): "video" | "pdf" | "image" {
  if (kind === "video") return "video";
  if (kind === "image") return "image";
  if (/\.pdf(\?|$)/i.test(url)) return "pdf";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) return "image";
  return "video";
}

export default function ServiceDemoModal({ open, onClose, url, kind = "video" }: ServiceDemoModalProps) {
  const mediaUrl = resolveFreelancerMedia(url) || url;
  const demoType = detectDemoType(kind, url);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="svc-demo-modal" role="dialog" aria-modal="true" aria-label="Xem demo dịch vụ" onClick={onClose}>
      <button type="button" className="svc-demo-modal__close" onClick={onClose} aria-label="Đóng">
        <FaTimes aria-hidden />
      </button>
      <div className="svc-demo-modal__content" onClick={(event) => event.stopPropagation()}>
        {demoType === "video" ? (
          <video src={mediaUrl} controls autoPlay playsInline className="svc-demo-modal__video" />
        ) : demoType === "pdf" ? (
          <iframe src={mediaUrl} title="Demo PDF" className="svc-demo-modal__iframe" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="Demo" className="svc-demo-modal__image" />
        )}
      </div>
    </div>
  );
}
