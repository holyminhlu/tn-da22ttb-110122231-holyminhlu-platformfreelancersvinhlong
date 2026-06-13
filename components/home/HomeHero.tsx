import { HERO_SKILL_TAGS } from "./data";
import HeroSearchBar from "./HeroSearchBar";
import HomeHeroBackground from "./HomeHeroBackground";
import HomeHeroTitle from "./HomeHeroTitle";

export default function HomeHero() {
  return (
    <section className="hero-section relative overflow-hidden pb-24 pt-16 text-white">
      <HomeHeroBackground />

      <div className="relative z-20 mx-auto flex min-h-[calc(92vh-8rem)] max-w-4xl flex-col items-center justify-center px-6 text-center">
        <HomeHeroTitle />
        <p className="mb-10 max-w-2xl text-xl text-neutral-300">
          Kết nối doanh nghiệp, hộ kinh doanh và người làm nghề tự do địa phương — đăng việc,
          nhận báo giá, ký quỹ an toàn trên nền tảng Vĩnh Long Connected.
        </p>

        <HeroSearchBar />

        <div className="flex flex-wrap justify-center gap-2 text-xs font-medium">
          {HERO_SKILL_TAGS.map((tag) => (
            <span key={tag} className="skill-tag cursor-pointer rounded-sm px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
