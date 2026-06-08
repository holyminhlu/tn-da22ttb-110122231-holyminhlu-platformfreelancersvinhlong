"use client";

import MessagesInbox from "@/components/chat/MessagesInbox";
import HireShell from "./HireShell";

export default function ClientHireMessagesPage() {
  return (
    <HireShell>
      <MessagesInbox
        viewerRole="client"
        copy={{
          guestMessage: "Đăng nhập tài khoản client để xem tin nhắn.",
          wrongRoleMessage: "Trang này dành cho client.",
          emptyListMessage: "Chưa có tin nhắn với freelancer.",
          emptyListHint:
            "Nhắn tin từ trang báo giá, tìm freelancer hoặc hồ sơ dịch vụ — hội thoại sẽ hiện ở đây.",
        }}
      />
    </HireShell>
  );
}
