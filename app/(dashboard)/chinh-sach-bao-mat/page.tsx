import PrivacyPolicyContent from "@/components/legal/PrivacyPolicyContent";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Chính sách bảo mật",
  "Chính sách bảo mật Vĩnh Long Connect — thu thập dữ liệu, xác minh danh tính, thanh toán PCI, phiên đăng nhập và quyền riêng tư người dùng.",
);

export default function PrivacyPolicyPage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <PrivacyPolicyContent />
      </main>
      <HomeFooter />
    </div>
  );
}
