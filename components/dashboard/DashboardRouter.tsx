"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStoredUser } from "@/hooks/useStoredUser";
import { ADMIN_HOME } from "@/lib/auth/roleRoutes";
import ClientDashboard from "./ClientDashboard";
import FreelancerDashboard from "./FreelancerDashboard";

export default function DashboardRouter() {
  const { t } = useTranslation();

  const router = useRouter();
  const { user, ready, isFreelancer, isClient, isAdmin } = useStoredUser();

  useEffect(() => {
    if (!ready || !isAdmin) return;
    router.replace(ADMIN_HOME);
  }, [ready, isAdmin, router]);

  if (!ready) {
    return (
      <div className="home-landing flex min-h-screen items-center justify-center bg-white text-gray-500">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="home-landing flex min-h-screen flex-col items-center justify-center gap-3 bg-white text-gray-500">
        <p>Vui lòng đăng nhập để xem bảng tổng quan.</p>
        <Link href="/dang-nhap" className="text-sm font-medium text-[#0066cc] hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="home-landing flex min-h-screen items-center justify-center bg-white text-gray-500">
        Đang chuyển đến trang quản trị…
      </div>
    );
  }

  if (isClient) {
    return <ClientDashboard />;
  }

  if (isFreelancer) {
    return <FreelancerDashboard />;
  }

  return (
    <div className="home-landing flex min-h-screen items-center justify-center bg-white text-gray-500">
      Tài khoản của bạn không có quyền truy cập bảng tổng quan.
    </div>
  );
}
