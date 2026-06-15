"use client";

import { Suspense } from "react";
import MessagesInbox from "@/components/chat/MessagesInbox";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import ClientIdentityVerifyGate from "./ClientIdentityVerifyGate";
import HireShell from "./HireShell";

export default function ClientHireMessagesPage() {
  const { loading, verified, user, idv } = useClientIdentityVerification();

  return (
    <HireShell>
      {loading ? (
        <p className="fw-messages-inbox__state">Đang kiểm tra tài khoản...</p>
      ) : !verified ? (
        <ClientIdentityVerifyGate
          user={user}
          idv={idv}
          title="Xác minh danh tính trước khi nhắn tin"
          lead="Hoàn thành 5 mục thông tin nhận dạng và xác minh thẻ tín dụng (bước 2) tại trang xác minh, sau đó bạn có thể nhắn tin với freelancer."
          backHref="/hire/search"
          backLabel="Quay lại tìm kiếm freelancer"
        />
      ) : (
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
      )}
    </HireShell>
  );
}
