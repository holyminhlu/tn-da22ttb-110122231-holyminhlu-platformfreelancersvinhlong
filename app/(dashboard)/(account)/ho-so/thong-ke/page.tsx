import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import ProfileStatsContent from "@/components/account/ProfileStatsContent";

export const metadata = freelancerPageMetadata(
  "Thống kê hồ sơ",
  "Lượt xem hồ sơ, chuyển đổi, dịch vụ, portfolio và điểm tiếp thị TMS.",
);

export default function ThongKeHoSoPage() {
  return (
    <div className="ea-main">
      <ProfileStatsContent />
    </div>
  );
}
