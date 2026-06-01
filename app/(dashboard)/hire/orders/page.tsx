import ClientServiceOrdersPage from "@/components/hire/ClientServiceOrdersPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Đơn dịch vụ",
  "Theo dõi đơn đặt dịch vụ và đề xuất từ freelancer.",
);

export default function HireOrdersPage() {
  return <ClientServiceOrdersPage />;
}
