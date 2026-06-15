import { Suspense } from "react";
import ClientManageDisputesPage from "@/components/manage/ClientManageDisputesPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Xử lý tranh chấp",
  "Theo dõi và xử lý tranh chấp đơn dịch vụ.",
);

export default function ManageDisputesPage() {
  return (
    <Suspense fallback={<p className="manage-page__state">Đang tải tranh chấp...</p>}>
      <ClientManageDisputesPage />
    </Suspense>
  );
}