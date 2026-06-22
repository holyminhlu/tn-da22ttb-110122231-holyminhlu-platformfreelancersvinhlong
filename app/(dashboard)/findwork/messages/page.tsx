import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FreelancerMessagesPage from "@/components/findwork/FreelancerMessagesPage";

export const metadata = freelancerPageMetadata(
  "Tin nhắn",
  "Xem tin nhắn từ khách hàng — việc liên quan và nội dung trao đổi.",
);

export default function FindworkMessagesRoutePage() {
  return <FreelancerMessagesPage />;
}
