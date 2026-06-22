import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FeedbackContent from "@/components/account/FeedbackContent";
import "@/components/account/feedback.css";

export const metadata = freelancerPageMetadata(
  "Phản hồi",
  "Quản lý nhận xét từ khách hàng về công việc đã hoàn thành.",
);

export default function PhanHoiPage() {
  return (
    <div className="ea-main">
      <FeedbackContent />
    </div>
  );
}
