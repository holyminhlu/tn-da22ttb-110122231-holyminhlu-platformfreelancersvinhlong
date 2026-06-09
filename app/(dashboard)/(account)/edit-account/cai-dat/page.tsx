import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import AccountSettingsContent from "@/components/account/AccountSettingsContent";

export const metadata = freelancerPageMetadata(
  "Cài đặt",
  "Thông báo, danh hiệu, ngôn ngữ, giao diện và quyền riêng tư tài khoản.",
);

export default function CaiDatPage() {
  return <AccountSettingsContent />;
}
