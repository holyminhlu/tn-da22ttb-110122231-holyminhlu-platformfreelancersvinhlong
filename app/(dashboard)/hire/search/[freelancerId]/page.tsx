import { Suspense } from "react";
import ClientHireFreelancerDetailPage from "@/components/hire/ClientHireFreelancerDetailPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Hồ sơ freelancer",
  "Xem đầy đủ thông tin, dịch vụ, portfolio và đánh giá trước khi thuê.",
);

export default function HireFreelancerDetailRoutePage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải hồ sơ...</p>}>
      <ClientHireFreelancerDetailPage />
    </Suspense>
  );
}
