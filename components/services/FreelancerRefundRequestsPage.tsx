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
            Xem yêu cầu hủy &amp; hoàn tiền từ client trên đơn của bạn. Bạn có 3 ngày để đồng ý
            hoặc phản đối — nếu không phản hồi, hệ thống có thể tự hoàn tiền cho client.
          </p>
        </header>
        <RefundRequestsPanel audience="freelancer" />
      </div>
    </ServicesShell>
  );
}
