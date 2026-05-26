import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import FreelancerDashboard from "@/components/dashboard/FreelancerDashboard";

export const metadata = freelancerPageMetadata(
  "Dashboard",
  "Tổng quan hồ sơ, dịch vụ, đánh giá và hợp đồng của freelancer.",
);

export default function DashboardPage() {
  return <FreelancerDashboard />;
}
