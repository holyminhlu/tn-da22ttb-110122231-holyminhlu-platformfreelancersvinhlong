import { Suspense } from "react";
import ClientHireQuotesPage from "@/components/hire/ClientHireQuotesPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Báo giá",
  "Quản lý đề xuất và báo giá từ freelancer cho công việc đã đăng.",
);

export default function HireQuotesPage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải báo giá...</p>}>
      <ClientHireQuotesPage />
    </Suspense>
  );
}
