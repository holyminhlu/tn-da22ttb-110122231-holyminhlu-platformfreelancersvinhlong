"use client";

import Link from "next/link";
import { FaIdCard, FaShieldAlt } from "react-icons/fa";
import { CLIENT_VERIFY_PAGE } from "@/lib/hire/clientVerification";

type ClientVerifyNoticeProps = {
  message: string;
  className?: string;
};

export default function ClientVerifyNotice({ message, className = "" }: ClientVerifyNoticeProps) {
  return (
    <div className={`client-verify-notice${className ? ` ${className}` : ""}`} role="status">
      <FaShieldAlt className="client-verify-notice__icon" aria-hidden />
      <p className="client-verify-notice__text">{message}</p>
      <Link href={CLIENT_VERIFY_PAGE} className="client-verify-notice__cta">
        <FaIdCard aria-hidden />
        Đi xác minh ngay
      </Link>
    </div>
  );
}
