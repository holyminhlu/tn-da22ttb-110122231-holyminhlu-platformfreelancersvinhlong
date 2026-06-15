"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { FaExclamationCircle, FaStar } from "react-icons/fa";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useStoredUser } from "@/hooks/useStoredUser";

type SaveJobButtonProps = {
  jobId: string;
  variant?: "icon" | "button";
  className?: string;
  onToggled?: (saved: boolean) => void;
};

export default function SaveJobButton({
  jobId,
  variant = "icon",
  className = "",
  onToggled,
}: SaveJobButtonProps) {
  const pathname = usePathname();
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const { canSave, isSaved, toggleSave, busyId, lastError, clearError } = useSavedJobs();
  const saved = isSaved(jobId);
  const busy = busyId === normalizeBusyId(jobId);
  const loginNext = pathname ? `?next=${encodeURIComponent(pathname)}` : "";

  useEffect(() => {
    if (!lastError) return;
    const timer = window.setTimeout(() => clearError(), 5000);
    return () => window.clearTimeout(timer);
  }, [lastError, clearError]);

  const jobError = lastError?.jobId === normalizeBusyId(jobId) ? lastError.message : "";

  if (ready && user && !isFreelancer) {
    return null;
  }

  if (!canSave) {
    if (!ready) {
      return variant === "button" ? (
        <span className={`wd-cta__btn wd-cta__btn--ghost opacity-50${className ? ` ${className}` : ""}`}>
          <FaStar aria-hidden />
          Lưu việc
        </span>
      ) : null;
    }

    if (variant === "button") {
      return (
        <Link
          href={`/dang-nhap${loginNext}`}
          className={`wd-cta__btn wd-cta__btn--ghost${className ? ` ${className}` : ""}`}
        >
          <FaStar aria-hidden />
          Đăng nhập để lưu
        </Link>
      );
    }
    return (
      <Link
        href={`/dang-nhap${loginNext}`}
        className={`rounded border p-2 text-gray-400 hover:text-blue-600${className ? ` ${className}` : ""}`}
        aria-label="Đăng nhập để lưu việc"
        title="Đăng nhập để lưu việc"
      >
        <FaStar aria-hidden />
      </Link>
    );
  }

  async function handleClick() {
    const nextSaved = await toggleSave(jobId);
    onToggled?.(nextSaved);
  }

  const errorHint = jobError ? (
      <span className="fw-save-error" role="alert">
        <FaExclamationCircle aria-hidden />
        {jobError}
      </span>
    ) : null;

  if (variant === "button") {
    return (
      <span className={`fw-save-wrap${className ? ` ${className}` : ""}`}>
        <button
          type="button"
          className={`wd-cta__btn wd-cta__btn--ghost${saved ? " wd-cta__btn--saved" : ""}`}
          aria-pressed={saved}
          disabled={busy}
          onClick={() => void handleClick()}
        >
          <FaStar aria-hidden className={saved ? "text-amber-500" : ""} />
          {busy ? "Đang lưu..." : saved ? "Đã lưu" : "Lưu việc"}
        </button>
        {errorHint}
      </span>
    );
  }

  return (
    <span className={`fw-save-wrap fw-save-wrap--icon${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className={`rounded border p-2 transition-colors${
          saved ? " border-amber-300 bg-amber-50 text-amber-600" : " text-gray-400 hover:text-blue-600"
        }`}
        aria-label={saved ? "Bỏ lưu việc" : "Lưu việc"}
        aria-pressed={saved}
        title={saved ? "Bỏ lưu" : "Lưu việc"}
        disabled={busy}
        onClick={() => void handleClick()}
      >
        <FaStar aria-hidden />
      </button>
      {errorHint}
    </span>
  );
}

function normalizeBusyId(jobId: string): string {
  return String(jobId || "").trim().toLowerCase();
}
