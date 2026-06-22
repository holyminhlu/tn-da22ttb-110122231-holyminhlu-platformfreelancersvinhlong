import type { Metadata } from "next";
import AdminReportsPage from "@/components/admin/AdminReportsPage";

export const metadata: Metadata = {
  title: "Báo cáo thống kê | VLC Admin",
  description: "Phân tích và biểu đồ vận hành Vĩnh Long Connect.",
  robots: "noindex",
};

export default function AdminReportsRoute() {
  return <AdminReportsPage />;
}
