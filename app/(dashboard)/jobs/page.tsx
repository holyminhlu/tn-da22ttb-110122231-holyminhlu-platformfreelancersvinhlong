import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import JobsPage from "@/components/jobs/JobsPage";

export const metadata = freelancerPageMetadata(
  "Hợp đồng việc",
  "Theo dõi hợp đồng từ báo giá job — tiến độ, bàn giao và nghiệm thu.",
);

export default function FreelancerJobsPage() {
  return <JobsPage />;
}
