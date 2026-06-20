"use client";

import { useTranslation } from "@/hooks/useTranslation";
import ServiceOrderWorkflow from "@/components/orders/ServiceOrderWorkflow";
import HireShell from "./HireShell";

export default function ClientOrderWorkflowPage() {
  const { t } = useTranslation();

  return (
    <HireShell>
      <ServiceOrderWorkflow backHref="/hire/orders" backLabel={t("Đơn dịch vụ")} />
    </HireShell>
  );
}
