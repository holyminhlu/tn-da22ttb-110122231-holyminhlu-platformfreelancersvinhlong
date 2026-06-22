"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Suspense } from "react";
import MessagesInbox from "@/components/chat/MessagesInbox";
import FreelancerWorkShell from "./FreelancerWorkShell";

export default function FreelancerMessagesPage() {
  const { t } = useTranslation();

  return (
    <FreelancerWorkShell>
      <Suspense fallback={<p className="fw-messages-inbox__state">{t("Đang tải tin nhắn...")}</p>}>
      <MessagesInbox
        viewerRole="freelancer"
        copy={{
          guestMessage: t("Đăng nhập tài khoản freelancer để xem tin nhắn."),
          wrongRoleMessage: t("Trang này dành cho freelancer."),
          emptyListMessage: t("Chưa có tin nhắn từ khách hàng."),
          emptyListHint: t("Khi khách hàng nhắn từ báo giá hoặc hồ sơ của bạn, hội thoại sẽ hiện ở đây."),
        }}
      />
      </Suspense>
    </FreelancerWorkShell>
  );
}
