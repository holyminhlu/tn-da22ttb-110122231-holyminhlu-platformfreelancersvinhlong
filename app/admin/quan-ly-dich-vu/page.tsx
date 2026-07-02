import type { Metadata } from "next";
import AdminServicesPage from "@/components/admin/AdminServicesPage";

export const metadata: Metadata = {
  title: "Quản lý Dịch vụ | VLC Admin",
  robots: "noindex",
};

export default function AdminServicesRoute() {
  return <AdminServicesPage />;
}
