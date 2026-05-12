import Image from "next/image";

const CAROUSEL_IMAGES: ReadonlyArray<{ src: string; alt: string }> = [
  { src: "/Media/Freelacer-Luong-Hanh.jpeg", alt: "Freelancer — Lương Hạnh" },
  { src: "/Media/freelancer.jpg", alt: "Freelancer" },
  { src: "/Media/freelancer.png", alt: "Freelancer công việc tự do" },
  { src: "/Media/hero-upwork.png", alt: "Làm việc linh hoạt" },
  { src: "/Media/hero.jpg", alt: "Không gian làm việc" },
  { src: "/Media/mistakes-to-avoid-when-hiring-freelancers-scaled-1.jpg", alt: "Thuê freelancer hiệu quả" },
  { src: "/Media/nghe-freelancer-la-gi.jpg", alt: "Nghề freelancer" },
  { src: "/Media/User_Avatar.png", alt: "Ảnh đại diện người dùng" },
  { src: "/Media/VinhLong.jpg", alt: "Vĩnh Long" },
  { src: "/Media/hero.jpg", alt: "Cộng đồng dịch vụ địa phương" },
];

export default function MediaCarousel3d() {
  return (
    <div
      className="vlc-media-carousel-panel mt-10 rounded-3xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/90 px-4 py-10 shadow-sm sm:px-8 sm:py-12"
      aria-labelledby="media-carousel-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">Thư viện hình ảnh</p>
        <h3 id="media-carousel-heading" className="mt-2 text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
          Không gian &amp; cộng đồng freelancer
        </h3>
        
      </div>

      <div
        className="vlc-media-carousel-scene mx-auto mt-10 flex max-w-full justify-center overflow-x-clip overflow-y-visible pb-8 pt-4 sm:pb-10 sm:pt-6"
        style={{ perspective: "1550px" }}
      >
        <div className="vlc-media-carousel-scale origin-center scale-[0.32] sm:scale-[0.54] md:scale-[0.74] lg:scale-[0.88] xl:scale-[0.98]">
          <div className="vlc-carousel3d-root">
            {CAROUSEL_IMAGES.map(({ src, alt }, i) => (
              <div
                key={`vlc-c3d-${i}-${src}`}
                className="vlc-carousel3d-face relative overflow-hidden border-2 border-white shadow-[0_8px_24px_-6px_rgba(15,23,42,0.35)] ring-1 ring-zinc-200/80"
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 120px, 180px"
                  className="object-cover brightness-[1.06] contrast-[1.03] saturate-[1.05]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
