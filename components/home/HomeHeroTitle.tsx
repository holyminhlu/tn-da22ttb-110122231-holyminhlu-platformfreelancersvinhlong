const titleTextClass = "text-5xl leading-tight font-bold text-white";

export default function HomeHeroTitle() {
  return (
    <h1 className="mb-4 flex flex-col items-center">
      <span className={titleTextClass}>
        Tìm &amp; Thuê <span className="text-amber-300">Freelancer</span>
      </span>
      <span className={titleTextClass}>
        Tại <span className="text-amber-300">Vĩnh Long</span>
      </span>
    </h1>
  );
}
