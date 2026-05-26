import { Suspense } from "react";
import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import MyProfileContent from "@/components/profile/MyProfileContent";
import "@/components/profile/my-profile.css";

export const metadata = freelancerPageMetadata(
  "Hồ sơ của tôi",
  "Quản lý hồ sơ freelancer — giới thiệu, kỹ năng, dịch vụ và portfolio.",
);

export default function HoSoPage() {
  return (
    <Suspense fallback={<p className="ea-loading px-4 py-12">Đang tải hồ sơ...</p>}>
      <MyProfileContent />
    </Suspense>
  );
}
