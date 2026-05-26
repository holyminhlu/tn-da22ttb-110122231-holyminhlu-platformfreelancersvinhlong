import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import "./find-freelancers.css";
import FindFreelancersBody from "./FindFreelancersBody";

export default function FindFreelancersPage() {
  return (
    <div className="home-landing find-freelancers-page min-h-screen text-gray-900">
      <HomeNavbar />
      <main id="main-content">
        <FindFreelancersBody />
      </main>
      <HomeFooter />
    </div>
  );
}
