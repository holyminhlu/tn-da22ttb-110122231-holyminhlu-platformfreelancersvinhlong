import { freelancerPageMetadata } from "@/components/layout/FreelancerPlaceholderPage";
import CredentialsContent from "@/components/account/CredentialsContent";

export const metadata = freelancerPageMetadata(
  "Tên đăng nhập và mật khẩu",
  "Đổi email đăng nhập và cập nhật mật khẩu tài khoản.",
);

export default function TenDangNhapPage() {
  return <CredentialsContent />;
}
