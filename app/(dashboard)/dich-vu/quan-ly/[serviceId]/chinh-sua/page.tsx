"use client";

import { useParams } from "next/navigation";
import ServiceCreateWizard from "@/components/services/ServiceCreateWizard";

export default function DichVuEditPage() {
  const params = useParams();
  const serviceId = typeof params.serviceId === "string" ? params.serviceId : "";

  return <ServiceCreateWizard editServiceId={serviceId || undefined} />;
}
