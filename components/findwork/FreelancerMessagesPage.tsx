"use client";

import MessagesInbox from "@/components/chat/MessagesInbox";
import FreelancerWorkShell from "./FreelancerWorkShell";

export default function FreelancerMessagesPage() {
  return (
    <FreelancerWorkShell>
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
    </FreelancerWorkShell>
  );
}
