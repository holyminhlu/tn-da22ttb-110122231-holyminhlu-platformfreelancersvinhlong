import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import "./find-work.css";
import FindWorkProviders from "./FindWorkProviders";
import FindWorkSubNav from "./FindWorkSubNav";

type FreelancerWorkShellProps = {
  children: React.ReactNode;
};

export default function FreelancerWorkShell({ children }: FreelancerWorkShellProps) {
  return (
    <div className="home-landing find-work-page min-h-screen text-gray-900">
      <HomeNavbar />
      <FindWorkSubNav />
      <main id="main-content" className="fw-main">
        <FindWorkProviders>{children}</FindWorkProviders>
      </main>
      <HomeFooter />
    </div>
  );
}
