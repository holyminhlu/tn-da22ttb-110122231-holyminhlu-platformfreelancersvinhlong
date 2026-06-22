import type { Metadata } from "next";
import AdminAccountsPage from "@/components/admin/AdminAccountsPage";

export const metadata: Metadata = {
  title: "Quản lý tài khoản | VLC Admin",
  robots: "noindex",
};

export default function AdminAccountsRoute() {
  return <AdminAccountsPage />;
}
