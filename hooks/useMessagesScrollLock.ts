"use client";

import { useEffect } from "react";

const BODY_CLASS = "vlc-messages-scroll-lock";

export function useMessagesScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;

    body.classList.add(BODY_CLASS);
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.classList.remove(BODY_CLASS);
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [enabled]);
}
