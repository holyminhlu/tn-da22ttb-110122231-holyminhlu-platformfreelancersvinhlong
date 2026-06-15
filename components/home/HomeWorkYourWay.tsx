import Image from "next/image";

const REGION_PANELS: Array<{
  title: string;
  button: string;
  src: string;
  featured?: boolean;
}> = [
  {
    title: "Trà Vinh",
    button: "Khám phá ngay",
    src: "/Media/trvinh.jpg",
  },
  {
    title: "Vĩnh Long",
    button: "Khám phá ngay",
    src: "/Media/vinhlonga.jpg",
    featured: true,
  },
  {
    title: "Bến Tre",
    button: "Khám phá ngay",
    src: "/Media/bentre.png",
  },
];

function RegionPanel({ title, button, src, featured = false }: (typeof REGION_PANELS)[number]) {
  return (
    <article
      className={`group relative overflow-hidden rounded-xl bg-[#1D1F2F] text-center text-white shadow-lg ring-1 ring-black/10 transition-transform duration-300 ${
        featured ? "md:scale-105 md:shadow-2xl md:ring-blue-500/30" : "md:scale-[0.97]"
      }`}
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[3/4]">
        <Image
          src={src}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/35" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <h3 className="text-2xl font-semibold md:text-3xl">{title}</h3>
        <button
          type="button"
          className="mt-6 flex h-12 items-center justify-center rounded-2xl border border-transparent bg-white px-4 py-2 text-xs text-black shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] transition duration-200 hover:shadow-lg sm:text-sm"
        >
          {button}
        </button>
      </div>
    </article>
  );
}

export default function HomeWorkYourWay() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">Làm việc theo cách của bạn</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-8">
          {REGION_PANELS.map((panel) => (
            <RegionPanel key={panel.title} {...panel} />
          ))}
        </div>
      </div>
    </section>
  );
}
