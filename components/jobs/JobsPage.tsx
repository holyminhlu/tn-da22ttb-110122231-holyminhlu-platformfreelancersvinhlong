import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import JobsBody from "./JobsBody";
import "./jobs.css";

export default function JobsPage() {
  return (
    <div className="home-landing jobs-page min-h-screen text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="jobs-main">
        <JobsBody />
      </main>
      <HomeFooter />
    </div>
  );
}
