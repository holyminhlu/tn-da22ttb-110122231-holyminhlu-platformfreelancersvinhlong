import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import AccountSecurityContent from "@/components/account/AccountSecurityContent";

export const metadata = freelancerPageMetadata(
  "Bảo mật tài khoản",
  "Quản lý xác thực, phiên đăng nhập, khôi phục và quyền riêng tư tài khoản.",
);

export default function BaoMatPage() {
  return <AccountSecurityContent />;
}
