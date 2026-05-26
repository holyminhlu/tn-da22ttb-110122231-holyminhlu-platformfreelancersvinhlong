import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import IdentityVerificationContent from "@/components/account/IdentityVerificationContent";

export const metadata = freelancerPageMetadata(
  "Xác minh danh tính",
  "Xác minh số điện thoại, thông tin liên hệ, ảnh và giấy tờ.",
);

export default function XacMinhDanhTinhPage() {
  return (
    <div className="ea-main">
      <IdentityVerificationContent />
    </div>
  );
}
