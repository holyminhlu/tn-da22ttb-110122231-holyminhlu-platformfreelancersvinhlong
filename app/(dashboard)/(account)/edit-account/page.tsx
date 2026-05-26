import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import EditAccountContent from "@/components/account/EditAccountContent";

export const metadata = freelancerPageMetadata(
  "Edit Account",
  "Cài đặt hồ sơ và thông tin liên hệ freelancer.",
);

export default function EditAccountRoutePage() {
  return <EditAccountContent />;
}
