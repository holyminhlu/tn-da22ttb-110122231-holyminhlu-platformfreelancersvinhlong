import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import WorkDetailPage from "@/components/findwork/WorkDetailPage";

export const metadata = freelancerPageMetadata(
  "Chi tiết công việc",
  "Xem mô tả, ngân sách và thông tin khách hàng — gửi yêu cầu báo giá.",
);

export default function WorkDetailRoutePage() {
  return <WorkDetailPage />;
}
