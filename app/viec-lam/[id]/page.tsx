import type { Metadata } from "next";
import JobDetailPage from "@/components/jobs/JobDetailPage";

export const metadata: Metadata = {
  title: "Chi tiết việc làm | Vĩnh Long Connected",
  description: "Thông tin đầy đủ tin tuyển freelancer kèm ảnh minh họa và hạn hoàn thành.",
};

export default async function JobDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailPage jobId={id} />;
}
