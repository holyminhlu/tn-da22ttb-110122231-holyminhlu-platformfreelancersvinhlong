import HowVlcWorksContent from "@/components/how-vlc-works/HowVlcWorksContent";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Cách VLC hoạt động",
  "Hướng dẫn quy trình sử dụng Vĩnh Long Connect cho người thuê và freelancer — từ đăng việc, báo giá đến ký quỹ Escrow.",
);

export default function HowVlcWorksPage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <HowVlcWorksContent />
      </main>
      <HomeFooter />
    </div>
  );
}
