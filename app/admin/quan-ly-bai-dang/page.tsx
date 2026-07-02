import type { Metadata } from "next";
import AdminPostsPage from "@/components/admin/AdminPostsPage";

export const metadata: Metadata = {
  title: "Quản lý Bài đăng | VLC Admin",
  robots: "noindex",
};

export default function AdminPostsRoute() {
  return <AdminPostsPage />;
}
