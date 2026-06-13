"use client";

import ServiceOrderWorkflow from "@/components/orders/ServiceOrderWorkflow";
import HireShell from "./HireShell";

export default function ClientOrderWorkflowPage() {
  return (
    <HireShell>
      <ServiceOrderWorkflow backHref="/hire/orders" backLabel="Đơn dịch vụ" />
    </HireShell>
  );
}
