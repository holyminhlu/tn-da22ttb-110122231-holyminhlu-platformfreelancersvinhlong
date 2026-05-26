import Image from "next/image";
import {
  FaChevronDown,
  FaHeart,
  FaImage,
  FaLaptopCode,
  FaListUl,
  FaPaperclip,
  FaPlayCircle,
  FaThumbsUp,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";
import type { FreelancerListing } from "./data";

type FreelancerCardProps = {
  freelancer: FreelancerListing;
};

export default function FreelancerCard({ freelancer }: FreelancerCardProps) {
  return (
    <article className="ff-card-shadow mb-6 overflow-hidden rounded-sm border border-gray-200 bg-white">
      <div className="flex p-4">
        <div className="mr-4 w-6 shrink-0">
          <input type="checkbox" className="mt-1" aria-label={`Select ${freelancer.name}`} />
        </div>
        <div className="min-w-0 flex-grow">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex min-w-0 items-center">
              <div className="mr-3 h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                <Image
                  src={freelancer.logo}
                  alt={freelancer.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="ff-guru-blue flex cursor-pointer items-center font-bold hover:underline">
                  <span className="truncate">{freelancer.name}</span>
                  <span className="ml-2 shrink-0 border border-gray-300 px-1 text-[10px] font-normal text-gray-400">
                    MEMBER
                  </span>
                  {freelancer.hasVideo ? (
                    <FaPlayCircle className="ml-2 shrink-0 text-blue-500" aria-hidden />
                  ) : null}
                </h3>
                <p className="text-xs text-gray-500">{freelancer.location}</p>
                <div className="mt-0.5 flex items-center text-[11px] text-gray-500">
                  <span className="mr-3 font-semibold">${freelancer.earnings} /yr</span>
                  <span className="flex items-center font-bold text-green-600">
                    <FaThumbsUp className="mr-1" aria-hidden />
                    {freelancer.rating}%
                  </span>
                </div>
              </div>
            </div>
            <div className="ml-3 flex shrink-0 items-center space-x-3">
              <button
                type="button"
                className="cursor-pointer text-gray-400 hover:text-red-500"
                aria-label="Save freelancer"
              >
                <FaHeart />
              </button>
              {freelancer.isWhatsApp ? (
                <FaWhatsapp className="text-xl text-green-500" aria-label="WhatsApp" />
              ) : null}
              <button
                type="button"
                className="rounded bg-[#5c8ab3] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#4a7294]"
              >
                Get a Quote
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden border border-gray-200 bg-gray-50 sm:w-1/4">
              {freelancer.thumbnail ? (
                <Image
                  src={freelancer.thumbnail}
                  alt="Work sample"
                  width={400}
                  height={200}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FaLaptopCode className="text-4xl text-gray-300" aria-hidden />
              )}
            </div>
            <div className="min-w-0 sm:w-3/4">
              <div className="flex flex-wrap items-center gap-x-2 space-y-1 text-sm font-bold text-gray-700 sm:space-y-0">
                <span>{freelancer.title}</span>
                <span className="text-xs font-normal text-gray-400">{freelancer.rate}</span>
                <span className="text-xs font-normal text-gray-400">
                  • Starting at {freelancer.minProject}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">
                {freelancer.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="mr-1 flex items-center text-[11px] font-bold text-gray-600">
                  <FaListUl className="mr-1" aria-hidden />
                  {freelancer.category}
                </span>
                {freelancer.skills.map((skill) => (
                  <span
                    key={skill}
                    className="cursor-pointer rounded-sm border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-t border-gray-200 bg-[#fafafa] text-[10px] font-bold uppercase text-gray-500">
        {[
          { icon: FaPaperclip, label: `More Services (${freelancer.services})`, rotate: true },
          { icon: FaImage, label: `Portfolio (${freelancer.portfolio})` },
          { icon: FaThumbsUp, label: "Performance" },
          { icon: FaUser, label: "About" },
        ].map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            className={`flex flex-1 cursor-pointer items-center justify-center py-2.5 hover:bg-gray-100 ${
              index < 3 ? "border-r border-gray-200" : ""
            }`}
          >
            <tab.icon
              className={`mr-1.5 ${"rotate" in tab && tab.rotate ? "rotate-45" : ""}`}
              aria-hidden
            />
            {tab.label}
            <FaChevronDown className="ml-1.5 text-[8px]" aria-hidden />
          </button>
        ))}
      </div>
    </article>
  );
}
