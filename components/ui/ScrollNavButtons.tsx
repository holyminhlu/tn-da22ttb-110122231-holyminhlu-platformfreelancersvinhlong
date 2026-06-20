"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useState } from "react";
import "./scroll-nav-buttons.css";

const SCROLL_EDGE = 80;
const SHOW_UP_AFTER = 120;

function canScrollPage() {
  if (typeof document === "undefined") return false;
  return document.documentElement.scrollHeight > window.innerHeight + SCROLL_EDGE;
}

export default function ScrollNavButtons() {
  const { t } = useTranslation();

  const [scrollable, setScrollable] = useState(false);
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  const update = useCallback(() => {
    const scrollablePage = canScrollPage();
    setScrollable(scrollablePage);
    if (!scrollablePage) {
      setShowUp(false);
      setShowDown(false);
      return;
    }

    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    setShowUp(scrollY > SHOW_UP_AFTER);
    setShowDown(scrollY < maxScroll - SCROLL_EDGE);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function scrollToTop() {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    window.scrollTo({ top: 0, behavior });
  }

  function scrollToBottom() {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior,
    });
  }

  if (!scrollable) return null;

  return (
    <nav
      className={`scroll-nav${showUp || showDown ? " scroll-nav--visible" : ""}`}
      aria-label="Điều hướng cuộn trang"
    >
      {showUp ? (
        <button
          type="button"
          className="scroll-nav__btn scroll-nav__btn--up"
          data-label="Lên đầu trang"
          aria-label="Lên đầu trang"
          onClick={scrollToTop}
        >
          <svg className="scroll-nav__icon" viewBox="0 0 384 512" aria-hidden>
            <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z" />
          </svg>
        </button>
      ) : null}
      {showDown ? (
        <button
          type="button"
          className="scroll-nav__btn scroll-nav__btn--down"
          data-label="Xuống cuối trang"
          aria-label="Xuống cuối trang"
          onClick={scrollToBottom}
        >
          <svg className="scroll-nav__icon" viewBox="0 0 384 512" aria-hidden>
            <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z" />
          </svg>
        </button>
      ) : null}
    </nav>
  );
}
