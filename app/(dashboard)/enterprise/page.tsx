import EnterpriseContent from "@/components/enterprise/EnterpriseContent";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Giải pháp Enterprise",
  "Vĩnh Long Connect Enterprise — nhân sự linh hoạt, tuân thủ pháp lý, hóa đơn gộp và hỗ trợ Account Manager 24/7 cho doanh nghiệp lớn.",
);

export default function EnterprisePage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <EnterpriseContent />
      </main>
      <HomeFooter />
    </div>
  );
}
