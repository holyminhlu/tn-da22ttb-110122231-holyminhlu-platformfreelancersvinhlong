import { Suspense } from "react";
import ClientOrderWorkflowPage from "@/components/hire/ClientOrderWorkflowPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Tiến trình đơn hàng",
  "Theo dõi và thao tác các giai đoạn thuê dịch vụ freelancer.",
);

export default function HireOrderWorkflowRoutePage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải đơn hàng...</p>}>
      <ClientOrderWorkflowPage />
    </Suspense>
  );
}
