"use client";

import { Suspense } from "react";
import MessagesInbox from "@/components/chat/MessagesInbox";
import HireShell from "./HireShell";

export default function ClientHireMessagesPage() {
  return (
    <HireShell>
      <Suspense fallback={<p className="fw-messages-inbox__state">Đang tải tin nhắn...</p>}>
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
      </Suspense>
    </HireShell>
  );
}
