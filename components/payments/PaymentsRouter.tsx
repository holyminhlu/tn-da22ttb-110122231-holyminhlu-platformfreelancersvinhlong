"use client";

import FreelancerPlaceholderPage from "@/components/layout/FreelancerPlaceholderPage";
import ClientPaymentsPage from "@/components/payments/ClientPaymentsPage";
import FreelancerPaymentsPage from "@/components/payments/FreelancerPaymentsPage";
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

  if (isFreelancer) {
    return <FreelancerPaymentsPage />;
  }

  if (user) {
    return <FreelancerPaymentsPage />;
  }

  return (
    <FreelancerPlaceholderPage
      title="Thanh toán"
      description="Vui lòng đăng nhập để xem thanh toán."
    />
  );
}
