import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FreelancerLeadsPage from "@/components/findwork/FreelancerLeadsPage";

export const metadata = freelancerPageMetadata(
  "Khách hàng tiềm năng",
  "Theo dõi client đang tuyển việc, phản hồi báo giá và đơn dịch vụ cần gửi đề xuất.",
);

export default function FindworkLeadsRoutePage() {
  return <FreelancerLeadsPage />;
}
