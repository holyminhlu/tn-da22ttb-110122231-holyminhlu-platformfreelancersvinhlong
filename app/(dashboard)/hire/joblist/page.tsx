import { Suspense } from "react";
import ClientHireJoblistPage from "@/components/hire/ClientHireJoblistPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Danh sách việc làm",
  "Quản lý công việc đã đăng, báo giá và trạng thái dự án.",
);

export default function HireJoblistPage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải danh sách việc...</p>}>
      <ClientHireJoblistPage />
    </Suspense>
  );
}
