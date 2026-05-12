import type { Metadata } from "next";
import PostJobPage from "@/components/jobs/PostJobPage";

export const metadata: Metadata = {
  title: "Đăng công việc | Vĩnh Long Connected",
  description: "Khách hàng đăng tin việc làm cần freelancer.",
};

export default function DangTinViecLamPage() {
  return <PostJobPage />;
}
