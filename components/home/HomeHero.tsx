import Image from "next/image";
import { HERO_SKILL_TAGS } from "./data";
import HeroSearchBar from "./HeroSearchBar";

export default function HomeHero() {
  return (
    <section className="hero-gradient relative overflow-hidden pb-24 pt-16 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
        <div>
          <h1 className="mb-4 text-5xl font-bold leading-tight">
            Tìm &amp; Thuê
            <br />
            Freelancer Tại Vĩnh Long
          </h1>
          <p className="mb-10 max-w-lg text-xl opacity-90">
            Kết nối doanh nghiệp, hộ kinh doanh và người làm nghề tự do địa phương — đăng việc,
            nhận báo giá, ký quỹ an toàn trên nền tảng Vĩnh Long Connected.
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
            src="/Media/anhVinhLong.jpg"
            alt="Toàn cảnh phát triển tại Vĩnh Long"
            width={640}
            height={400}
            className="relative z-10 ml-auto w-full max-w-[520px] rounded-lg object-cover shadow-2xl"
            style={{
              aspectRatio: "16 / 10",
              maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
            }}
            priority
          />
        </div>
      </div>
    </section>
  );
}
