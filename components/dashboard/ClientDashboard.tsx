"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FaUserTie } from "react-icons/fa";
import ClientShell from "@/components/layout/ClientShell";
import { isClientRole } from "@/hooks/useStoredUser";
import { getMe, isFreelancerMeResponse, type MeUser } from "@/lib/api/users";
import { formatVnd } from "@/lib/format";

function billingCode(userId: string) {
  const digits = userId.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(0, 10);
  return digits.padStart(10, "0").slice(0, 10) || "0000000000";
}

function DashboardWidget({
  title,
  headLinks,
  children,
}: {
  title: string;
  headLinks?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="client-widget">
      <header className="client-widget__head">
        <span>{title}</span>
        {headLinks ? <div className="client-widget__head-links">{headLinks}</div> : null}
      </header>
      <div className="client-widget__body">{children}</div>
    </section>
  );
}

export default function ClientDashboard() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const me = await getMe();
        if (cancelled) return;
        if (isFreelancerMeResponse(me) || !isClientRole(me.user?.role)) {
          setError("Tài khoản này không phải client.");
          setUser(null);
          return;
        }
        setUser(me.user);
      } catch (err) {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể tải dashboard.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.fullName?.trim() || user?.email || "—";

  return (
    <ClientShell>
      {loading ? (
        <p className="client-page__desc">Đang tải dữ liệu...</p>
      ) : error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : user ? (
        <>
          <header className="client-dashboard__header">
            <div className="client-dashboard__profile">
              <div className="client-dashboard__avatar" aria-hidden>
                <FaUserTie />
              </div>
              <div>
                <div className="client-dashboard__name">
                  {displayName}
                  <span className="client-dashboard__meta">
                    {" "}
                    ({" "}
                    <Link href="/edit-account">Thống kê của tôi</Link>
                    <span className="client-widget__sep">|</span>
                    <span>Chưa có phản hồi</span> )
                  </span>
                </div>
                <p className="client-dashboard__billing">Mã thanh toán: {billingCode(user.id)}</p>
              </div>
            </div>
            <div className="client-dashboard__cash">
              <div>
                <strong>Tài khoản tiền mặt:</strong>{" "}
                <span className="client-dashboard__meta">{formatVnd(0)}</span>
              </div>
              <Link href="/payments">Nạp tiền</Link>
            </div>
          </header>

          <div className="client-dashboard__grid">
            <DashboardWidget
              title="Hire"
              headLinks={
                <>
                  <Link href="/hire">Đăng việc</Link>
                  <span className="client-widget__sep">|</span>
                  <Link href="/hire">Thuê lại</Link>
                </>
              }
            >
              <h3 className="client-widget__title">Sẵn sàng thuê?</h3>
              <Link href="/hire" className="client-widget__link">
                Đăng việc và nhận báo giá
              </Link>
              <Link href="/freelancers" className="client-widget__link">
                Tìm freelancer và yêu cầu báo giá
              </Link>
              <Link href="/hire" className="client-widget__link">
                Thuê lại freelancer từ các job trước
              </Link>
            </DashboardWidget>

            <DashboardWidget
              title="Manage"
              headLinks={<Link href="/manage">Quản lý viên của tôi</Link>}
            >
              <p className="client-widget__muted">
                Không có công việc nào cần quản lý hoặc tất cả công việc đã được bỏ ghim.
              </p>
            </DashboardWidget>

            <DashboardWidget
              title="Payments"
              headLinks={<Link href="/payments">Tạo hóa đơn</Link>}
            >
              <p className="client-widget__muted">Không có hóa đơn mới.</p>
            </DashboardWidget>
          </div>
        </>
      ) : null}
    </ClientShell>
  );
}
