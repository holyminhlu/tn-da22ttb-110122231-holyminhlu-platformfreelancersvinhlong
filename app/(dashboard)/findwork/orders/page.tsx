import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FreelancerServiceOrdersPage from "@/components/findwork/FreelancerServiceOrdersPage";

export const metadata = freelancerPageMetadata(
  "Đơn dịch vụ",
  "Quản lý đơn đặt gói dịch vụ từ Client — đề xuất, thực hiện và bàn giao.",
);

export default function FindworkOrdersPage() {
  return <FreelancerServiceOrdersPage />;
}
