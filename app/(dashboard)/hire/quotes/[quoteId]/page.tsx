import { Suspense } from "react";
import ClientHireQuoteDetailPage from "@/components/hire/ClientHireQuoteDetailPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Chi tiết báo giá",
  "Xem đầy đủ đề xuất và thông tin freelancer trước khi thuê.",
);

export default function HireQuoteDetailRoutePage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải chi tiết báo giá...</p>}>
      <ClientHireQuoteDetailPage />
    </Suspense>
  );
}
