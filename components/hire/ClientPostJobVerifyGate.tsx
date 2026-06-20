"use client";

import { useTranslation } from "@/hooks/useTranslation";
import ClientIdentityVerifyGate from "./ClientIdentityVerifyGate";
import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import type { MeUser } from "@/lib/api/users";

type ClientPostJobVerifyGateProps = {
  user: MeUser | null;
  idv: IdentityVerificationResponse | null;
};

export default function ClientPostJobVerifyGate({
  user, idv }: ClientPostJobVerifyGateProps) {
  const { t } = useTranslation();

  return (
    <ClientIdentityVerifyGate
      user={user}
      idv={idv}
      title={t("Xác minh danh tính trước khi đăng tin")}
      lead={t("Hoàn thành 5 mục thông tin nhận dạng và xác minh thẻ tín dụng (bước 2) tại trang xác minh, sau đó bạn có thể đăng tin tuyển dụng.")}
      backHref="/hire/joblist"
      backLabel={t("Quay lại danh sách việc làm")}
    />
  );
}
