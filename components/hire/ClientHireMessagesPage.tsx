"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Suspense } from "react";
import MessagesInbox from "@/components/chat/MessagesInbox";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import ClientIdentityVerifyGate from "./ClientIdentityVerifyGate";
import HireShell from "./HireShell";

export default function ClientHireMessagesPage() {
  const { t } = useTranslation();

  const { loading, verified, user, idv } = useClientIdentityVerification();

  return (
    <HireShell>
      {loading ? (
        <p className="fw-messages-inbox__state">{t("Đang kiểm tra tài khoản...")}</p>
      ) : !verified ? (
        <ClientIdentityVerifyGate
          user={user}
          idv={idv}
          title={t("Xác minh danh tính trước khi nhắn tin")}
          lead={t("Hoàn thành 5 mục thông tin nhận dạng và xác minh thẻ tín dụng (bước 2) tại trang xác minh, sau đó bạn có thể nhắn tin với freelancer.")}
          backHref="/hire/search"
          backLabel={t("Quay lại tìm kiếm freelancer")}
        />
      ) : (
        <Suspense fallback={<p className="fw-messages-inbox__state">{t("Đang tải tin nhắn...")}</p>}>
          <MessagesInbox
            viewerRole="client"
            copy={{
              guestMessage: t("Đăng nhập tài khoản client để xem tin nhắn."),
              wrongRoleMessage: t("Trang này dành cho client."),
              emptyListMessage: t("Chưa có tin nhắn với freelancer."),
              emptyListHint: t("Nhắn tin từ trang báo giá, tìm freelancer hoặc hồ sơ dịch vụ — hội thoại sẽ hiện ở đây."),
            }}
          />
        </Suspense>
      )}
    </HireShell>
  );
}
