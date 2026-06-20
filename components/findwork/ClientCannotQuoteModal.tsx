"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useEffect, useId } from "react";
import { FaBriefcase, FaSearch, FaTimes, FaUserTie } from "react-icons/fa";
import "./job-proposal-form.css";

type ClientCannotQuoteModalProps = {
  open: boolean;
  onClose: () => void;
  jobTitle?: string;
  /** Client đang xem chính tin tuyển dụng của mình */
  isOwnJob?: boolean;
  jobId?: string;
};

export default function ClientCannotQuoteModal({
  open,
  onClose,
  jobTitle,
  isOwnJob = false,
  jobId,
}: ClientCannotQuoteModalProps) {
  const { t } = useTranslation();

  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
  const t = tUi;
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const manageHref = jobId ? `/hire/joblist/${jobId}` : "/hire/joblist";

  return (
    <div className="job-proposal-modal" role="presentation">
      <div
        className="job-proposal-modal__dialog job-proposal-modal__dialog--notice"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="job-proposal-modal__close"
          onClick={onClose}
          aria-label={t("Đóng")}
        >
          <FaTimes aria-hidden />
        </button>

        <div className="job-proposal-notice__icon" aria-hidden>
          <FaUserTie />
        </div>

        <header className="job-proposal-notice__header">
          <h2 id={titleId} className="job-proposal-notice__title">
            Tài khoản khách hàng không gửi báo giá
          </h2>
          {jobTitle ? (
            <p className="job-proposal-notice__subtitle" title={jobTitle}>
              {jobTitle}
            </p>
          ) : null}
        </header>

        <div className="job-proposal-notice__body">
          {isOwnJob ? (
            <p>
              Đây là tin tuyển dụng của bạn. Khách hàng không ứng tuyển vào job của chính mình — hãy
              chờ freelancer gửi báo giá, sau đó xem và chọn trong mục quản lý.
            </p>
          ) : (
            <p>
              Bạn đang đăng nhập bằng tài khoản <strong>{t("khách hàng")}</strong>. Chỉ{" "}
              <strong>freelancer</strong> mới gửi báo giá cho công việc của người khác.
            </p>
          )}

          <ul className="job-proposal-notice__tips">
            {isOwnJob ? (
              <>
                <li>
                  <FaBriefcase aria-hidden />
                  Xem báo giá đã nhận và gửi đề xuất cho freelancer
                </li>
                <li>
                  <FaSearch aria-hidden />
                  Theo dõi trạng thái tuyển dụng của tin này
                </li>
              </>
            ) : (
              <>
                <li>
                  <FaBriefcase aria-hidden />
                  Đăng tin tuyển dụng để nhận báo giá từ freelancer
                </li>
                <li>
                  <FaUserTie aria-hidden />
                  Cần nhận việc? Đăng ký hoặc chuyển sang tài khoản freelancer
                </li>
              </>
            )}
          </ul>
        </div>

        <footer className="job-proposal-notice__footer">
          {isOwnJob ? (
            <Link href={manageHref} className="job-proposal-btn job-proposal-btn--primary" onClick={onClose}>
              Quản lý báo giá
            </Link>
          ) : (
            <>
              <Link href="/hire/post" className="job-proposal-btn job-proposal-btn--primary" onClick={onClose}>
                Đăng tin tuyển dụng
              </Link>
              <Link href="/hire/quotes" className="job-proposal-btn job-proposal-btn--ghost" onClick={onClose}>
                Xem báo giá của tôi
              </Link>
            </>
          )}
          <button type="button" className="job-proposal-btn job-proposal-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}

export function isClientCannotQuoteError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("chỉ freelancer") || m.includes("freelancer mới có thể gửi báo giá");
}
