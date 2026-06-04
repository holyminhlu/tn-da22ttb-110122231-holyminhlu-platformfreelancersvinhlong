import Image from "next/image";
import { WHY_CHOOSE_LEFT, WHY_CHOOSE_RIGHT } from "./data";
import { WhyIcon } from "./icons";

export default function HomeWhyChoose() {
  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-4xl font-bold">Vì sao chọn Vĩnh Long Connected</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>
        <div className="relative flex flex-col items-center justify-between gap-8 lg:flex-row">
          <div className="flex-1 space-y-16 lg:text-right">
            {WHY_CHOOSE_LEFT.map((item) => (
              <div key={item.title} className="group">
                <div className="mb-3 flex items-center space-x-4 lg:justify-end">
                  <h3 className="text-xl font-bold transition group-hover:text-blue-600">{item.title}</h3>
                  <WhyIcon
                    name={item.icon}
                    className="text-2xl text-gray-400 transition group-hover:text-blue-500"
                  />
                </div>
                <p className="max-w-xs text-sm text-gray-500 lg:ml-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-1 justify-center py-8">
            <div className="relative h-[400px] w-[400px]">
              <div className="absolute inset-0 scale-110 rounded-full bg-gray-100 opacity-50" />
              <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-[12px] border-white shadow-2xl">
                <Image
                  src="/Media/anhVinhLong2.jpg"
                  alt="Vĩnh Long về đêm — đô thị và sông nước"
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>
              <div className="pointer-events-none absolute -bottom-10 left-1/2 z-20 h-20 w-full max-w-md -translate-x-1/2 bg-gradient-to-t from-white to-transparent" />
            </div>
          </div>

          <div className="flex-1 space-y-16 lg:text-left">
            {WHY_CHOOSE_RIGHT.map((item) => (
              <div key={item.title} className="group">
                <div className="mb-3 flex items-center space-x-4 lg:justify-start">
                  <WhyIcon
                    name={item.icon}
                    className="text-2xl text-gray-400 transition group-hover:text-blue-500"
                  />
                  <h3 className="text-xl font-bold transition group-hover:text-blue-600">{item.title}</h3>
                </div>
                <p className="max-w-xs text-sm text-gray-500 lg:mr-auto">{item.desc}</p>
              </div>
            ))}
            <div className="pt-4">
              <button
                type="button"
                className="rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                Khám phá nền tảng
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
