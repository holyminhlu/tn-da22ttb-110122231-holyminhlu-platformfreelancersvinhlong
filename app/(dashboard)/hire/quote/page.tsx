import { Suspense } from "react";
import ClientServiceQuotePage from "@/components/hire/ClientServiceQuotePage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Yêu cầu báo giá",
  "Chọn gói dịch vụ và gửi yêu cầu thuê freelancer.",
);

export default function HireQuotePage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải...</p>}>
      <ClientServiceQuotePage />
    </Suspense>
  );
}
