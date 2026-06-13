import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FreelancerJobQuotesPage from "@/components/findwork/FreelancerJobQuotesPage";

export const metadata = freelancerPageMetadata(
  "Báo giá job",
  "Theo dõi báo giá đã gửi cho client — phỏng vấn, offer và kết quả tuyển.",
);

export default function FindworkQuotesRoutePage() {
  return <FreelancerJobQuotesPage />;
}
