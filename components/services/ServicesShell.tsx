import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import "../findwork/find-work.css";
import ServicesSubNav from "./ServicesSubNav";
import "./services-hub.css";

type ServicesShellProps = {
  children: React.ReactNode;
};

export default function ServicesShell({ children }: ServicesShellProps) {
  return (
    <div className="home-landing find-work-page svc-hub-page min-h-screen text-gray-900">
      <HomeNavbar />
      <ServicesSubNav />
      <main id="main-content" className="svc-hub-main">
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}
