import type { Metadata } from "next";
import JobsPage from "@/components/jobs/JobsPage";

export const metadata: Metadata = {
  title: "Việc làm | Vĩnh Long Connected",
  description: "Danh sách việc làm do khách hàng đăng — kết nối freelancer địa phương.",
};

export default function ViecLamPage() {
  return <JobsPage />;
}
