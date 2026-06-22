import type { Metadata } from "next";
import HelpPage from "@/components/help/HelpPage";

export const metadata: Metadata = {
  title: "Trợ giúp — Vĩnh Long Connect",
  description:
    "Trung tâm trợ giúp và FAQ — chọn Khách hàng hoặc Freelancer để xem hướng dẫn sử dụng, Escrow, thanh toán và xác minh.",
};

export default function HelpRoutePage() {
  return <HelpPage />;
}
