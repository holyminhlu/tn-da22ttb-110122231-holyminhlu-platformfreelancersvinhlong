import { Suspense } from "react";
import ClientHireJobManagePage from "@/components/hire/ClientHireJobManagePage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Quản lý tuyển dụng",
  "Screening hồ sơ, phỏng vấn, gửi offer và theo dõi hợp đồng theo từng công việc.",
);

export default function HireJobManageRoutePage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải quản lý tuyển dụng...</p>}>
      <ClientHireJobManagePage />
    </Suspense>
  );
}

