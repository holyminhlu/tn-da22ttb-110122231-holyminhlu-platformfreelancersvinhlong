import { Suspense } from "react";
import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FreelancerOrderWorkflowPage from "@/components/findwork/FreelancerOrderWorkflowPage";

export const metadata = freelancerPageMetadata(
  "Chi tiết đơn dịch vụ",
  "Theo dõi và xử lý đơn đặt dịch vụ từ Khách hàng.",
);

export default function FindworkOrderDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500 p-4">Đang tải đơn...</p>}>
      <FreelancerOrderWorkflowPage />
    </Suspense>
  );
}
