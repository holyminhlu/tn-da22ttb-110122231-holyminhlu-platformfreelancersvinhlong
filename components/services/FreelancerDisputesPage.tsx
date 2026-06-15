"use client";

import { useSearchParams } from "next/navigation";
import ServicesShell from "./ServicesShell";
import DisputesPanel from "@/components/manage/DisputesPanel";
import "../manage/manage.css";
import "./services-hub.css";

export default function FreelancerDisputesPage() {
  const searchParams = useSearchParams();
  const initialDisputeId = searchParams.get("dispute");
  const initialContractId = searchParams.get("contract");

  return (
    <ServicesShell>
      <div className="svc-resolution-page">
        <header className="svc-resolution-page__head">
          <h1 className="svc-resolution-page__title">Xử lý tranh chấp</h1>
          <p className="svc-resolution-page__lead">
            Theo dõi tranh chấp liên quan đơn dịch vụ, trao đổi với client và Admin trong Trung tâm
            giải quyết. Phản hồi đúng hạn để tránh quyết định bất lợi.
          </p>
        </header>
        <DisputesPanel
          audience="freelancer"
          initialDisputeId={initialDisputeId}
          initialContractId={initialContractId}
        />
      </div>
    </ServicesShell>
  );
}
