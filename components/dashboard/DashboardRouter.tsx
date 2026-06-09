"use client";

import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";
import ClientDashboard from "./ClientDashboard";
import FreelancerDashboard from "./FreelancerDashboard";

export default function DashboardRouter() {
  const { user, ready, isFreelancer, isClient } = useStoredUser();

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
        <Link href="/login" className="text-sm font-medium text-[#0066cc] hover:underline">
          Đăng nhập
        </Link>
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
