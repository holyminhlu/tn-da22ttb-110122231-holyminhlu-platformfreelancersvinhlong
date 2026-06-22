import TermsOfServiceContent from "@/components/legal/TermsOfServiceContent";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Điều khoản dịch vụ",
  "Điều khoản sử dụng Vĩnh Long Connect — Escrow, SLA hợp đồng, hoàn tiền, tranh chấp và quyền trách nhiệm của Khách hàng, Freelancer.",
);

export default function TermsOfServicePage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <TermsOfServiceContent />
      </main>
      <HomeFooter />
    </div>
  );
}
