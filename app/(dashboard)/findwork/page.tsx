import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FindWorkPage from "@/components/findwork/FindWorkPage";

export const metadata = freelancerPageMetadata(
  "Find Work",
  "Tìm việc làm tự do — danh sách công việc đang mở.",
);

export default function FindWorkRoutePage() {
  return <FindWorkPage />;
}
