import { Suspense } from "react";
import AdminRefundsPage from "@/components/admin/AdminRefundsPage";

export const metadata = {
  title: "Quản lý hoàn tiền — VLC Admin",
  description: "Admin theo dõi và xử lý yêu cầu hoàn tiền đơn dịch vụ.",
};

export default function AdminHoanTienPage() {
  return (
    <Suspense fallback={<p className="admin-page__state">Đang tải hoàn tiền...</p>}>
      <AdminRefundsPage />
    </Suspense>
  );
}
