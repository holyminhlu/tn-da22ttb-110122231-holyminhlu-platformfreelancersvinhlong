import CategoryPills from "@/components/home/CategoryPills";
import FeaturedFreelancers from "@/components/home/FeaturedFreelancers";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 bg-zinc-50">
        <Hero />
        <CategoryPills />
        <FeaturedFreelancers />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
