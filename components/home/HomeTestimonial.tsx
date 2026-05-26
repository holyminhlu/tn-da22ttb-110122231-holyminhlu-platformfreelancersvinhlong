import Image from "next/image";
import { FaChevronLeft, FaChevronRight } from "./icons";

export default function HomeTestimonial() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-bold">What Clients Say</h2>
        <div className="mx-auto mb-16 h-1 w-12 bg-blue-500" />
        <div className="relative px-12">
          <p className="mb-12 text-lg italic leading-relaxed text-gray-600">
            In our company, we do ongoing research with our target audience. This includes 30-45
            minute phone interviews. It was difficult to conduct the interview, really listen, and ask
            good follow up questions while trying to capture it all in thorough hand-written notes. One
            of our writers suggested using VLC Connected to find someone to transcribe these
            interviews... The person I hired is the one I&apos;ve stuck with for nearly two years now
            — she is fast, accurate, and affordable. I&apos;d never have found her on my own, given
            that I live in Utah and she lives in South Africa. I could never have arranged such an
            effective solution to my on-going need for transcripts without VLC Connected. It&apos;s
            been a life-saver.
          </p>
          <div className="flex flex-col items-center">
            <Image
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100"
              alt="Ed Bagley"
              width={64}
              height={64}
              className="mb-4 rounded-full object-cover"
            />
            <h4 className="font-bold">Ed Bagley</h4>
            <p className="text-sm text-gray-500">Director of Product Marketing, O.C. Tanner Company</p>
          </div>
          <button
            type="button"
            className="absolute -left-4 top-1/2 text-3xl text-gray-300 hover:text-blue-500"
            aria-label="Previous testimonial"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className="absolute -right-4 top-1/2 text-3xl text-gray-300 hover:text-blue-500"
            aria-label="Next testimonial"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
