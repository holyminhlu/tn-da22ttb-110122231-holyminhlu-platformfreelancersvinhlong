"use client";

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

  if (isClient) {
    return <ClientDashboard />;
  }

  if (isFreelancer || user) {
    return <FreelancerDashboard />;
  }

  return (
    <div className="home-landing flex min-h-screen items-center justify-center bg-white text-gray-500">
      Vui lòng đăng nhập để xem dashboard.
    </div>
  );
}
