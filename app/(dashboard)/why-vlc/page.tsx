import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import WhyVlcContent from "@/components/why-vlc/WhyVlcContent";
import { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Tại sao chọn VLC",
  "Lý do doanh nghiệp và freelancer chọn Vĩnh Long Connect — minh bạch, SafePay, hỗ trợ địa phương và phí cạnh tranh.",
);

export default function WhyVlcPage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <WhyVlcContent />
      </main>
      <HomeFooter />
    </div>
  );
}
