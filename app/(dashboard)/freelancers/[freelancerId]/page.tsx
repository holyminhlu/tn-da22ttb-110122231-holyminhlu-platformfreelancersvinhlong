import { Suspense } from "react";
import ClientHireFreelancerDetailPage from "@/components/hire/ClientHireFreelancerDetailPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ Freelancer — Vĩnh Long Connected",
  description:
    "Xem hồ sơ, dịch vụ, portfolio và đánh giá freelancer trước khi đăng nhập để thuê.",
};

export default function PublicFreelancerDetailRoutePage() {
  return (
    <Suspense fallback={<p className="hire-page__state">Đang tải hồ sơ...</p>}>
      <ClientHireFreelancerDetailPage publicBrowse />
    </Suspense>
  );
}
