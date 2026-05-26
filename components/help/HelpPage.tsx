import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import HelpLanding from "./HelpLanding";
import "./help.css";

export default function HelpPage() {
  return (
    <div className="home-landing help-page flex min-h-screen flex-col text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="flex-grow">
        <HelpLanding />
      </main>
      <HomeFooter />
    </div>
  );
}
