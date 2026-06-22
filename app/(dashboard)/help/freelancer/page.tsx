import type { Metadata } from "next";
import { Suspense } from "react";
import HelpCenter from "@/components/help/HelpCenter";
import HelpCenterSkeleton from "@/components/help/HelpCenterSkeleton";

export const metadata: Metadata = {
  title: "Trợ giúp Freelancer — Vĩnh Long Connect",
  description:
    "Câu hỏi thường gặp cho Freelancer: tìm việc, báo giá, Escrow, rút tiền PIN và tranh chấp.",
};

export default function HelpFreelancerPage() {
  return (
    <Suspense fallback={<HelpCenterSkeleton />}>
      <HelpCenter initialRole="freelancer" />
    </Suspense>
  );
}
