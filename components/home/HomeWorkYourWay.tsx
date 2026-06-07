"use client";

import Carousel from "@/components/ui/carousel";

const REGION_SLIDES = [
  {
    title: "Trà Vinh",
    button: "Khám phá ngay",
    src: "/Media/trvinh.jpg",
  },
  {
    title: "Bến Tre",
    button: "Khám phá ngay",
    src: "/Media/bentre.png",
  },
  {
    title: "Vĩnh Long",
    button: "Khám phá ngay",
    src: "/Media/vinhlonga.jpg",
  },
];

export default function HomeWorkYourWay() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">Làm việc theo cách của bạn</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>
        <div className="relative w-full overflow-hidden py-10 pb-20">
          <Carousel slides={REGION_SLIDES} />
        </div>
      </div>
    </section>
  );
}
