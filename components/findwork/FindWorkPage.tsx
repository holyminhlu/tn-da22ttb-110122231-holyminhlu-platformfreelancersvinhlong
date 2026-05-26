import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import "./find-work.css";
import FindWorkBody from "./FindWorkBody";
import FindWorkSubNav from "./FindWorkSubNav";

export default function FindWorkPage() {
  return (
    <div className="home-landing find-work-page min-h-screen text-gray-900">
      <HomeNavbar />
      <FindWorkSubNav />
      <main id="main-content">
        <FindWorkBody />
      </main>
      <HomeFooter />
    </div>
  );
}
