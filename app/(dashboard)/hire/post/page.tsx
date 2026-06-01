import { Suspense } from "react";
import ClientPostJobPage from "@/components/hire/ClientPostJobPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Đăng tin tuyển dụng",
  "Đăng công việc theo từng bước sau khi xác minh danh tính.",
);

export default function HirePostJobPage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải...</p>}>
      <ClientPostJobPage />
    </Suspense>
  );
}