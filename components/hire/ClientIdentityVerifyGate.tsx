"use client";

import Link from "next/link";
import { FaIdCard, FaShieldAlt } from "react-icons/fa";
import {
  clientVerificationProgress,
  CLIENT_VERIFY_LEAD,
  CLIENT_VERIFY_PAGE,
  getClientVerificationBlockers,
} from "@/lib/hire/clientVerification";
import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import type { MeUser } from "@/lib/api/users";
import "./post-job.css";

type ClientIdentityVerifyGateProps = {
  user: MeUser | null;
  idv: IdentityVerificationResponse | null;
  title?: string;
  lead?: string;
  backHref?: string;
  backLabel?: string;
};

export default function ClientIdentityVerifyGate({
  user,
  idv,
  title = "Xác minh danh tính trước khi tiếp tục",
  lead,
  backHref = "/hire/search",
  backLabel = "Quay lại tìm kiếm freelancer",
}: ClientIdentityVerifyGateProps) {
  const { completed, total } = clientVerificationProgress(user, idv);
  const blockers = getClientVerificationBlockers(user, idv);
  const leadText = lead ?? `${CLIENT_VERIFY_LEAD} Sau đó bạn có thể sử dụng đầy đủ tính năng thuê việc.`;

  return (
    <div className="post-job-gate">
      <div className="post-job-gate__icon-wrap" aria-hidden>
        <FaShieldAlt className="post-job-gate__icon" />
      </div>
      <h1 className="post-job-gate__title">{title}</h1>
      <p className="post-job-gate__lead">{leadText}</p>
      <p className="post-job-gate__progress">
        Tiến độ nhận dạng: <strong>{completed}/{total}</strong> mục
      </p>
      {blockers.length > 0 ? (
        <ul className="post-job-gate__blockers">
          {blockers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="post-job-gate__actions">
        <Link href={CLIENT_VERIFY_PAGE} className="post-job-gate__cta">
          <FaIdCard aria-hidden />
          Đi xác minh ngay
        </Link>
        <Link href={backHref} className="post-job-gate__back">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
