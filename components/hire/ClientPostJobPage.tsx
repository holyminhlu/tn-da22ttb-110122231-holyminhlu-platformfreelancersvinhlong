"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getIdentityVerification } from "@/lib/api/identityVerification";
import { getMe, type MeUser } from "@/lib/api/users";
import { isClientIdentityVerified } from "@/lib/hire/clientVerification";
import { isClientRole } from "@/hooks/useStoredUser";
import ClientPostJobVerifyGate from "./ClientPostJobVerifyGate";
import ClientPostJobWizard from "./ClientPostJobWizard";
import HireShell from "./HireShell";
import "./hire.css";
import "./post-job.css";

export default function ClientPostJobPage() {
  const { t } = useTranslation();

  const router = useRouter();
  const searchParams = useSearchParams();
  const editJobId = searchParams.get("edit")?.trim() || null;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeUser | null>(null);
  const [verified, setVerified] = useState(false);
  const [idv, setIdv] = useState<Awaited<ReturnType<typeof getIdentityVerification>> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [me, identity] = await Promise.all([getMe(), getIdentityVerification()]);
      if (!isClientRole(me.user?.role)) {
        setError(t("Chỉ tài khoản client mới được đăng tin tuyển dụng."));
        setUser(null);
        return;
      }
      setUser(me.user);
      setIdv(identity);
      setVerified(isClientIdentityVerified(me.user, identity));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải thông tin tài khoản.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      router.replace("/dang-nhap");
      return;
    }
    void load();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load, router]);

  return (
    <HireShell>
      <div className="hire-page hire-post-job hire-post-job--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">
              {editJobId ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng"}
            </h1>
            <p className="hire-page__lead">
              {editJobId
                ? "Cập nhật thông tin tin đang mở tuyển — chỉ áp dụng khi chưa có hợp đồng đang chạy."
                : "Hoàn thành từng bước để đăng công việc — freelancer sẽ gửi báo giá sau khi tin được duyệt hiển thị."}
            </p>
          </div>
          <Link href="/hire/joblist" className="hire-page__post-btn hire-page__post-btn--outline">
            Danh sách việc làm
          </Link>
        </header>

        {loading ? (
          <p className="hire-page__state">{t("Đang kiểm tra tài khoản...")}</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : verified ? (
          <ClientPostJobWizard editJobId={editJobId} />
        ) : (
          <ClientPostJobVerifyGate user={user} idv={idv} />
        )}
      </div>
    </HireShell>
  );
}
