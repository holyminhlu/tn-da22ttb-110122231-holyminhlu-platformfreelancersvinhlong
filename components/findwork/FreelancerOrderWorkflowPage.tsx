"use client";

import { useTranslation } from "@/hooks/useTranslation";
import ServiceOrderWorkflow from "@/components/orders/ServiceOrderWorkflow";
import FreelancerWorkShell from "./FreelancerWorkShell";

export default function FreelancerOrderWorkflowPage() {
  const { t } = useTranslation();

  return (
    <FreelancerWorkShell>
      <ServiceOrderWorkflow backHref="/dich-vu/don-hang" backLabel={t("Đơn hàng dịch vụ")} />
    </FreelancerWorkShell>
  );
}
