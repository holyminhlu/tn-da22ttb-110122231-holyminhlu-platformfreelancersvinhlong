import ContactPageContent from "@/components/contact/ContactPageContent";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Liên hệ",
  "Liên hệ Vĩnh Long Connect — email, điện thoại, địa chỉ tại Vĩnh Long và các kênh mạng xã hội.",
);

export default function ContactPage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <ContactPageContent />
      </main>
      <HomeFooter />
    </div>
  );
}
