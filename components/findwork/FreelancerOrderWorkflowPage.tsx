"use client";

import ServiceOrderWorkflow from "@/components/orders/ServiceOrderWorkflow";
import FreelancerWorkShell from "./FreelancerWorkShell";

export default function FreelancerOrderWorkflowPage() {
  return (
    <FreelancerWorkShell>
      <ServiceOrderWorkflow backHref="/findwork/orders" backLabel="Đơn dịch vụ của tôi" />
    </FreelancerWorkShell>
  );
}
