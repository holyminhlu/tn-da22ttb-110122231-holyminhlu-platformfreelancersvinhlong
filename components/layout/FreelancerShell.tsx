import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";

type FreelancerShellProps = {
  children: React.ReactNode;
};

export default function FreelancerShell({ children }: FreelancerShellProps) {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        {children}
      </main>
      <HomeFooter />
    </div>
  );
}
