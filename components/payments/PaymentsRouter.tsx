"use client";

import FreelancerPlaceholderPage from "@/components/layout/FreelancerPlaceholderPage";
import ClientPaymentsPage from "@/components/payments/ClientPaymentsPage";
import { useStoredUser } from "@/hooks/useStoredUser";

export default function PaymentsRouter() {
  const { user, ready, isClient, isFreelancer } = useStoredUser();

  if (!ready) {
    return (
      <div className="home-landing flex min-h-screen items-center justify-center bg-white text-gray-500">
        Đang tải...
      </div>
    );
  }

  if (isClient) {
    return <ClientPaymentsPage />;
  }

  if (isFreelancer || user) {
    return (
      <FreelancerPlaceholderPage
        title="Payments"
        description="Thanh toán và số dư tài khoản — sẽ kết nối accounts / transactions sau."
      />
    );
  }

  return (
    <FreelancerPlaceholderPage
      title="Payments"
      description="Vui lòng đăng nhập để xem thanh toán."
    />
  );
}
