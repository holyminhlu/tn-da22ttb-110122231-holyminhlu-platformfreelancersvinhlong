import HomeNavbarAuth from "./HomeNavbarAuth";
import HomeNavbarCta from "./HomeNavbarCta";
import HomeNavbarLogo from "./HomeNavbarLogo";
import HomeNavbarNav from "./HomeNavbarNav";

export default function HomeNavbar() {
  return (
    <header className="home-navbar sticky top-0 z-50">
      <nav className="flex items-center justify-between border-b border-border bg-background/95 px-6 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center space-x-8">
          <HomeNavbarLogo />
          <HomeNavbarNav />
        </div>
        <div className="flex items-center space-x-6 text-sm font-medium">
          <HomeNavbarCta />
          <HomeNavbarAuth />
        </div>
      </nav>
    </header>
  );
}
