import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import "@/components/dashboard/client-dashboard.css";

type ClientShellProps = {
  children: React.ReactNode;
  beforeMain?: React.ReactNode;
};

export default function ClientShell({ children, beforeMain }: ClientShellProps) {
  return (
    <div className="home-landing client-shell min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      {beforeMain}
      <main id="main-content" className="client-shell__main">
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}
