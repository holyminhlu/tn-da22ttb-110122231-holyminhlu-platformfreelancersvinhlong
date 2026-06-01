"use client";

import Link from "next/link";
import { FaIdCard, FaShieldAlt } from "react-icons/fa";
import {
  clientVerificationProgress,
  getClientVerificationBlockers,
} from "@/lib/hire/clientVerification";
import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import type { MeUser } from "@/lib/api/users";

type ClientPostJobVerifyGateProps = {
  user: MeUser | null;
  idv: IdentityVerificationResponse | null;
};

export default function ClientPostJobVerifyGate({ user, idv }: ClientPostJobVerifyGateProps) {
  const { completed, total } = clientVerificationProgress(user, idv);
  const blockers = getClientVerificationBlockers(user, idv);

  return (
    <div className="post-job-gate">
      <div className="post-job-gate__icon-wrap" aria-hidden>
        <FaShieldAlt className="post-job-gate__icon" />
      </div>
      <h1 className="post-job-gate__title">Xác minh danh tính trước khi đăng tin</h1>
      <p className="post-job-gate__lead">
        Hoàn thành 5 mục thông tin nhận dạng và xác minh thẻ tín dụng (bước 2) tại trang xác minh,
        sau đó bạn có thể đăng tin tuyển dụng.
      </p>
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
        <Link href="/edit-account/xac-minh" className="post-job-gate__cta">
          <FaIdCard aria-hidden />
          Đi xác minh ngay
        </Link>
        <Link href="/hire/joblist" className="post-job-gate__back">
          Quay lại danh sách việc làm
        </Link>
      </div>
    </div>
  );
}
