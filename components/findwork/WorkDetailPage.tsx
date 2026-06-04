import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import "./find-work.css";
import "./work-detail.css";
import FindWorkSubNav from "./FindWorkSubNav";
import WorkDetailContent from "./WorkDetailContent";

export default function WorkDetailPage() {
  return (
    <div className="home-landing work-detail-page find-work-page min-h-screen text-gray-900">
      <HomeNavbar />
      <FindWorkSubNav />
      <main id="main-content" className="wd-main pt-4">
        <WorkDetailContent />
      </main>
      <HomeFooter />
    </div>
  );
}
