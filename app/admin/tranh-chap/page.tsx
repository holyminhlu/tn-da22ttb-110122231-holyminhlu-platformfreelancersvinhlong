import { Suspense } from "react";
import AdminDisputesPage from "@/components/admin/AdminDisputesPage";

export const metadata = {
  title: "Quản lý tranh chấp — VLC Admin",
  description: "Admin xem xét và giải quyết tranh chấp đơn dịch vụ.",
};

export default function AdminTranhChapPage() {
  return (
    <Suspense fallback={<p className="admin-page__state">Đang tải tranh chấp...</p>}>
      <AdminDisputesPage />
    </Suspense>
  );
}
