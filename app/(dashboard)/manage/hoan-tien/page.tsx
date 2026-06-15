import ClientManageRefundPage from "@/components/manage/ClientManageRefundPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Yêu cầu hoàn tiền",
  "Theo dõi yêu cầu hoàn tiền từ client.",
);

export default function ManageRefundPage() {
  return <ClientManageRefundPage />;
}
