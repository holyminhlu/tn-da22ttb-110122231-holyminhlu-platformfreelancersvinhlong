import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import AboutPageContent from "@/components/about/AboutPageContent";
import { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Giới thiệu về VLC",
  "Tìm hiểu sứ mệnh, tầm nhìn và đội ngũ đứng sau Vĩnh Long Connected — nền tảng kết nối freelancer và doanh nghiệp tại Vĩnh Long.",
);

export default function AboutPage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <AboutPageContent />
      </main>
      <HomeFooter />
    </div>
  );
}
