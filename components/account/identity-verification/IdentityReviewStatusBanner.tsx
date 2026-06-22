"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import Link from "next/link";
import { FaCheckCircle, FaClock, FaExclamationTriangle } from "react-icons/fa";
import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import { formatDate } from "@/lib/format";

export type AdminReviewStatus = "pending" | "approved" | "rejected" | null;

export function getAdminReviewStatus(
  idv: IdentityVerificationResponse | null,
): AdminReviewStatus {
  const raw = idv?.verification?.admin_review_status;
  if (raw === "pending" || raw === "approved" || raw === "rejected") return raw;
  return null;
}

type IdentityReviewStatusBannerProps = {
  data: IdentityVerificationResponse;
};

export default function IdentityReviewStatusBanner({ data }: IdentityReviewStatusBannerProps) {
  const v = data.verification;
  if (!v?.submitted_for_review_at) return null;

  const status = getAdminReviewStatus(data);
  const reviewedAt = v.admin_reviewed_at;
  const note = v.admin_review_note?.trim();
  const submittedAt = formatDateUi(v.submitted_for_review_at);

  if (status === "approved") {
    return (
      <div className="idv-status idv-status--approved" role="status">
        <FaCheckCircle className="idv-status__icon" aria-hidden />
        <div className="idv-status__body">
          <p className="idv-status__title">Tài khoản đã được admin duyệt</p>
          <p className="idv-status__text">
            Xác minh danh tính của bạn đã hoàn tất
            {reviewedAt ? ` vào ${formatDateUi(reviewedAt)}` : ""}. Bạn có thể báo giá, lưu việc và
            thao tác với các job trên nền tảng.
          </p>
          <Link href="/findwork" className="idv-status__link">
            Khám phá việc làm →
          </Link>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="idv-status idv-status--rejected" role="alert">
        <FaExclamationTriangle className="idv-status__icon" aria-hidden />
        <div className="idv-status__body">
          <p className="idv-status__title">Hồ sơ xác minh chưa được duyệt</p>
          <p className="idv-status__text">
            Admin đã xem xét hồ sơ của bạn{reviewedAt ? ` vào ${formatDateUi(reviewedAt)}` : ""} và
            yêu cầu bổ sung hoặc chỉnh sửa thông tin.
          </p>
          {note ? <p className="idv-status__note">Ghi chú từ admin: {note}</p> : null}
          <p className="idv-status__hint">
            Vui lòng cập nhật thông tin ở các bước trên rồi gửi lại để xem xét.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="idv-status idv-status--pending" role="status">
      <FaClock className="idv-status__icon" aria-hidden />
      <div className="idv-status__body">
        <p className="idv-status__title">Hồ sơ đang chờ admin duyệt</p>
        <p className="idv-status__text">
          Bạn đã gửi hồ sơ xem xét{submittedAt !== "—" ? ` vào ${submittedAt}` : ""}. Admin sẽ duyệt
          trong 2–5 ngày làm việc. Sau khi được duyệt, bạn mới có thể báo giá và thao tác với job.
        </p>
      </div>
    </div>
  );
}
