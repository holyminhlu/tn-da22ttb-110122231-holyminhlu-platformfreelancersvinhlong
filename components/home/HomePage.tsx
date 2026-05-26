import "./home.css";
import HomeBrowseLists from "./HomeBrowseLists";
import HomeCategories from "./HomeCategories";
import HomeCta from "./HomeCta";
import HomeEnterprise from "./HomeEnterprise";
import HomeFooter from "./HomeFooter";
import HomeHero from "./HomeHero";
import HomeInsights from "./HomeInsights";
import HomeNavbar from "./HomeNavbar";
import HomeStats from "./HomeStats";
import HomeSteps from "./HomeSteps";
import HomeTestimonial from "./HomeTestimonial";
import HomeWhyChoose from "./HomeWhyChoose";
import HomeWorkYourWay from "./HomeWorkYourWay";

export default function HomePage() {
  return (
    <div className="home-landing min-h-screen bg-white text-gray-900">
      <HomeNavbar />
      <HomeHero />
      <HomeStats />
      <HomeCategories />
      <HomeWhyChoose />
      <HomeSteps />
      <HomeWorkYourWay />
      <HomeEnterprise />
      <HomeTestimonial />
      <HomeInsights />
      <HomeCta />
      <HomeBrowseLists />
      <HomeFooter />
    </div>
  );
}
