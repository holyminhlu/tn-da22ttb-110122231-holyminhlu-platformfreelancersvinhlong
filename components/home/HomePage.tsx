import "./home.css";
import HomeBrowseLists from "./HomeBrowseLists";
import HomeCategories from "./HomeCategories";
import HomeFooter from "./HomeFooter";
import HomeHero from "./HomeHero";
import HomeNavbar from "./HomeNavbar";
import HomeStats from "./HomeStats";
import HomeSteps from "./HomeSteps";
import HomeWhyChoose from "./HomeWhyChoose";
import HomeWorkYourWay from "./HomeWorkYourWay";

export default function HomePage() {
  return (
    <div className="home-landing min-h-screen bg-background text-foreground">
      <HomeNavbar />
      <HomeHero />
      <HomeStats />
      <HomeCategories />
      <HomeWhyChoose />
      <HomeSteps />
      <HomeWorkYourWay />
      <HomeBrowseLists />
      <HomeFooter />
    </div>
  );
}
