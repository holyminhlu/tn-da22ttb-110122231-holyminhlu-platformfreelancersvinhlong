"use client";

import { useTranslation } from "@/hooks/useTranslation";
import FreelancerPlaceholderPage from "@/components/layout/FreelancerPlaceholderPage";
import ClientPaymentsPage from "@/components/payments/ClientPaymentsPage";
import FreelancerPaymentsPage from "@/components/payments/FreelancerPaymentsPage";
import { useStoredUser } from "@/hooks/useStoredUser";

export default function PaymentsRouter() {
  const { t } = useTranslation();

  const { user, ready, isClient, isFreelancer } = useStoredUser();

  if (!ready) {
    return (
      <div className="home-landing flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {t("Đang tải...")}
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
      title={t("Thanh toán")}
      description={t("Vui lòng đăng nhập để xem thanh toán.")}
    />
  );
}
