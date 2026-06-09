import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import "@/components/dashboard/client-dashboard.css";

type ClientShellProps = {
  children: React.ReactNode;
  beforeMain?: React.ReactNode;
  /** Bảng tổng quan: tràn full width hai bên */
  wide?: boolean;
};

export default function ClientShell({ children, beforeMain, wide }: ClientShellProps) {
  return (
    <div className="home-landing client-shell min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      {beforeMain}
      <main
        id="main-content"
        className={`client-shell__main${wide ? " client-shell__main--wide" : ""}`}
      >
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}
