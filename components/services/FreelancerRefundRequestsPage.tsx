"use client";

import ServicesShell from "./ServicesShell";
import RefundRequestsPanel from "@/components/manage/RefundRequestsPanel";
import "../manage/manage.css";
import "./services-hub.css";

export default function FreelancerRefundRequestsPage() {
  return (
    <ServicesShell>
      <div className="svc-resolution-page">
        <header className="svc-resolution-page__head">
          <h1 className="svc-resolution-page__title">Yêu cầu hoàn tiền</h1>
          <p className="svc-resolution-page__lead">
            Xem yêu cầu hủy từ client và mức bạn nhận nếu đồng ý (50/50 ở GĐ3 chính đáng, hoặc phí
            phạt + việc đã làm nếu hủy ngang). Bạn có 3 ngày phản hồi.
          </p>
        </header>
        <RefundRequestsPanel audience="freelancer" />
      </div>
    </ServicesShell>
  );
}
