"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaStar } from "react-icons/fa";
import { useSavedJobs } from "@/hooks/useSavedJobs";

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
  const { canSave, isSaved, toggleSave, busyId } = useSavedJobs();
  const saved = isSaved(jobId);
  const busy = busyId === jobId;
  const loginNext = pathname ? `?next=${encodeURIComponent(pathname)}` : "";

  if (!canSave) {
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

  if (variant === "button") {
    return (
      <button
        type="button"
        className={`wd-cta__btn wd-cta__btn--ghost${saved ? " wd-cta__btn--saved" : ""}${className ? ` ${className}` : ""}`}
        aria-pressed={saved}
        disabled={busy}
        onClick={() => void handleClick()}
      >
        <FaStar aria-hidden className={saved ? "text-amber-500" : ""} />
        {busy ? "Đang lưu..." : saved ? "Đã lưu" : "Lưu việc"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`rounded border p-2 transition-colors${
        saved ? " border-amber-300 bg-amber-50 text-amber-600" : " text-gray-400 hover:text-blue-600"
      }${className ? ` ${className}` : ""}`}
      aria-label={saved ? "Bỏ lưu việc" : "Lưu việc"}
      aria-pressed={saved}
      title={saved ? "Bỏ lưu" : "Lưu việc"}
      disabled={busy}
      onClick={() => void handleClick()}
    >
      <FaStar aria-hidden />
    </button>
  );
}
