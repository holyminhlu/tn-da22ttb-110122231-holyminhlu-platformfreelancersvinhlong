import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";
import "@/components/dashboard/client-dashboard.css";

type FreelancerShellProps = {
  children: React.ReactNode;
  /** Bảng tổng quan: tràn full width hai bên */
  wide?: boolean;
};

export default function FreelancerShell({ children, wide }: FreelancerShellProps) {
  return (
    <div className="home-landing client-shell min-h-screen bg-background text-foreground">
      <HomeNavbar />
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
