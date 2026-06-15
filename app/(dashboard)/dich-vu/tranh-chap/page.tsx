import { Suspense } from "react";
import FreelancerDisputesPage from "@/components/services/FreelancerDisputesPage";

export const metadata = {
  title: "Xử lý tranh chấp — Dịch vụ",
  description: "Freelancer theo dõi và trao đổi trong tranh chấp đơn dịch vụ.",
};

export default function DichVuTranhChapPage() {
  return (
    <Suspense fallback={<p className="manage-page__state">Đang tải tranh chấp...</p>}>
      <FreelancerDisputesPage />
    </Suspense>
  );
}