import { Suspense } from "react";
import FreelancerOrderWorkflowPage from "@/components/findwork/FreelancerOrderWorkflowPage";
import I18nText from "@/components/ui/I18nText";
import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";

export const metadata = freelancerPageMetadata(
  "Chi tiết đơn dịch vụ",
  "Theo dõi và xử lý đơn đặt dịch vụ từ Client.",
);

export default function ServiceOrderDetailPage() {
  return (
    <Suspense
      fallback={
        <p className="p-4 text-sm text-gray-500">
          <I18nText text="Đang tải đơn..." />
        </p>
      }
    >
      <FreelancerOrderWorkflowPage />
    </Suspense>
  );
}
