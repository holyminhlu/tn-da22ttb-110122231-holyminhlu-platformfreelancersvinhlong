"use client";

import ServiceOrderWorkflow from "@/components/orders/ServiceOrderWorkflow";
import HireShell from "./HireShell";

export default function ClientOrderWorkflowPage() {
  return (
    <HireShell>
      <ServiceOrderWorkflow backHref="/manage" backLabel="Phòng làm việc / Quản lý" />
    </HireShell>
  );
}
