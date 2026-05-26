import Image from "next/image";
import { HERO_SKILL_TAGS } from "./data";
import HeroSearchBar from "./HeroSearchBar";

export default function HomeHero() {
  return (
    <section className="hero-gradient relative overflow-hidden pb-24 pt-16 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
        <div>
          <h1 className="mb-4 text-5xl font-bold leading-tight">
            Find &amp; Hire
            <br />
            Expert Freelancers
          </h1>
          <p className="mb-10 max-w-lg text-xl opacity-90">
            Work with the best freelance talent from around the world on our secure, flexible and
            cost-effective platform.
          </p>

          <HeroSearchBar />

          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {HERO_SKILL_TAGS.map((tag) => (
              <span key={tag} className="skill-tag cursor-pointer rounded-sm px-3 py-1">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="relative hidden lg:block">
          <Image
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800"
            alt="Freelancer"
            width={450}
            height={560}
            className="relative z-10 ml-auto w-[450px] rounded-lg"
            style={{
              maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
            }}
            priority
          />
        </div>
      </div>
    </section>
  );
}
