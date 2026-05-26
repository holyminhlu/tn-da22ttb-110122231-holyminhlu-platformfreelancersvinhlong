import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import JobsPage from "@/components/jobs/JobsPage";

export const metadata = freelancerPageMetadata(
  "Việc làm",
  "Quản lý công việc đã nhận, lọc theo trạng thái và tìm theo mã hoặc tiêu đề.",
);

export default function FreelancerJobsPage() {
  return <JobsPage />;
}
