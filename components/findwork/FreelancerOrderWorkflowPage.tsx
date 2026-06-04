"use client";

import ServiceOrderWorkflow from "@/components/orders/ServiceOrderWorkflow";
import FreelancerWorkShell from "./FreelancerWorkShell";

export default function FreelancerOrderWorkflowPage() {
  return (
    <FreelancerWorkShell>
      <ServiceOrderWorkflow backHref="/dich-vu/don-hang" backLabel="Đơn hàng dịch vụ" />
    </FreelancerWorkShell>
  );
}
