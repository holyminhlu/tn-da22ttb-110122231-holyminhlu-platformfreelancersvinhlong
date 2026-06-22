import type { Metadata } from "next";
import { Suspense } from "react";
import HelpCenter from "@/components/help/HelpCenter";
import HelpCenterSkeleton from "@/components/help/HelpCenterSkeleton";

export const metadata: Metadata = {
  title: "Trợ giúp Khách hàng — Vĩnh Long Connect",
  description:
    "Câu hỏi thường gặp cho Khách hàng: đăng tin, Escrow, thanh toán, tranh chấp và xác minh tài khoản.",
};

export default function HelpEmployerPage() {
  return (
    <Suspense fallback={<HelpCenterSkeleton />}>
      <HelpCenter initialRole="employer" />
    </Suspense>
  );
}
