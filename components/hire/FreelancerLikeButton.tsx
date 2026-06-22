"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

type FreelancerLikeButtonProps = {
  freelancerId: string;
  isFavorite: boolean;
  favoriteCount: number;
  onToggle: (freelancerId: string) => void | Promise<void>;
  disabled?: boolean;
  guestHref?: string;
  compact?: boolean;
};

export default function FreelancerLikeButton({
  freelancerId,
  isFavorite,
  favoriteCount,
  onToggle,
  disabled = false,
  guestHref,
  compact = false,
}: FreelancerLikeButtonProps) {
  const { t } = useTranslation();

  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [displayCount, setDisplayCount] = useState(favoriteCount);
  const [prevCount, setPrevCount] = useState(favoriteCount);

  useEffect(() => {
    setDisplayCount(favoriteCount);
  }, [favoriteCount]);

  const safeCount = Math.max(0, displayCount);

  async function handleToggle() {
    if (disabled || busy) return;
    setBusy(true);
    setPrevCount(displayCount);
    try {
      await onToggle(freelancerId);
    } finally {
      setBusy(false);
    }
  }

  if (guestHref) {
    return (
      <Link
        href={guestHref}
        className={`hire-like-button hire-like-button--guest${compact ? " hire-like-button--compact" : ""}`}
        aria-label={t("Đăng nhập để lưu yêu thích")}
      >
        <span className="hire-like-button__like">
          <svg className="hire-like-button__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
          </svg>
          {!compact ? <span className="hire-like-button__text">{t("Yêu thích")}</span> : null}
        </span>
        <span className="hire-like-button__count hire-like-button__count--static">{safeCount}</span>
      </Link>
    );
  }

  return (
    <div
      className={`hire-like-button${compact ? " hire-like-button--compact" : ""}${busy ? " hire-like-button--busy" : ""}${isFavorite ? " hire-like-button--active" : ""}`}
    >
      <input
        id={inputId}
        className="hire-like-button__on"
        type="checkbox"
        checked={isFavorite}
        readOnly
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        className="hire-like-button__like"
        disabled={disabled || busy}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào danh sách yêu thích"}
        onClick={() => void handleToggle()}
      >
        <svg className="hire-like-button__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
        {!compact ? <span className="hire-like-button__text">{t("Yêu thích")}</span> : null}
      </button>
      <span className="hire-like-button__count hire-like-button__count--one">{Math.max(0, prevCount)}</span>
      <span className="hire-like-button__count hire-like-button__count--two">{safeCount}</span>
    </div>
  );
}
