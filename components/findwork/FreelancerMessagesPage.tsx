"use client";

import { Suspense } from "react";
import MessagesInbox from "@/components/chat/MessagesInbox";
import FreelancerWorkShell from "./FreelancerWorkShell";

export default function FreelancerMessagesPage() {
  return (
    <FreelancerWorkShell>
      <Suspense fallback={<p className="fw-messages-inbox__state">Đang tải tin nhắn...</p>}>
      <MessagesInbox
        viewerRole="freelancer"
        copy={{
          guestMessage: "Đăng nhập tài khoản freelancer để xem tin nhắn.",
          wrongRoleMessage: "Trang này dành cho freelancer.",
          emptyListMessage: "Chưa có tin nhắn từ client.",
          emptyListHint:
            "Khi client nhắn từ báo giá hoặc hồ sơ của bạn, hội thoại sẽ hiện ở đây.",
        }}
      />
      </Suspense>
    </FreelancerWorkShell>
  );
}
