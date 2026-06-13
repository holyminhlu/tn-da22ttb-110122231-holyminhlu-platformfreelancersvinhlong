import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FreelancerSavedJobsPage from "@/components/findwork/FreelancerSavedJobsPage";

export const metadata = freelancerPageMetadata(
  "Công việc đã lưu",
  "Danh sách công việc freelancer đã lưu từ marketplace Tìm việc.",
);

export default function FindworkSavedJobsRoutePage() {
  return <FreelancerSavedJobsPage />;
}
