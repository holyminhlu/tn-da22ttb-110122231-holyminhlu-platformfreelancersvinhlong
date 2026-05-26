import {
  FaChevronDown,
  FaFilter,
  FaListUl,
  FaMapMarkerAlt,
  FaSearch,
  FaThLarge,
} from "react-icons/fa";
import {
  BROWSE_CATEGORIES,
  FREELANCER_LISTINGS,
  TOTAL_FREELANCERS,
  TOTAL_SERVICES,
} from "./data";
import FreelancerCard from "./FreelancerCard";

const PAGINATION_PAGES = [1, 2, 3, 4] as const;

export default function FindFreelancersBody() {
  return (
    <>
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-bold text-gray-800">Find and Hire Freelancers</h1>
          <p className="text-sm text-gray-500">
            We found {TOTAL_FREELANCERS} Freelancers offering {TOTAL_SERVICES} freelancing services
            online.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-6xl px-4 pb-10">
        <div className="mb-6 flex flex-col gap-2 rounded border border-gray-200 bg-white p-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 overflow-hidden rounded border border-gray-300">
            <button
              type="button"
              className="flex shrink-0 items-center whitespace-nowrap border-r border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
            >
              <FaListUl className="mr-2" aria-hidden />
              Any Category
              <FaChevronDown className="ml-2 text-[8px]" aria-hidden />
            </button>
            <input
              type="search"
              placeholder="Search Freelancers"
              className="min-w-0 flex-grow px-3 py-1.5 text-sm outline-none"
            />
            <button
              type="button"
              className="border-l border-gray-300 bg-gray-50 px-4 py-1.5"
              aria-label="Search"
            >
              <FaSearch className="text-gray-400" />
            </button>
          </div>
          <button
            type="button"
            className="flex items-center rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600"
          >
            <FaMapMarkerAlt className="mr-2 text-gray-400" aria-hidden />
            Location
            <FaChevronDown className="ml-2 text-[8px]" aria-hidden />
          </button>
          <button
            type="button"
            className="flex items-center rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600"
          >
            <FaFilter className="mr-2 text-gray-400" aria-hidden />
            Filters
            <FaChevronDown className="ml-2 text-[8px]" aria-hidden />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center text-xs text-gray-500">
            <input type="checkbox" className="mr-2" />
            {TOTAL_FREELANCERS} Results
          </label>
          <p className="text-xs text-gray-500">
            Sort by:{" "}
            <span className="font-bold text-gray-700">
              Relevance <FaChevronDown className="ml-1 inline text-[8px]" aria-hidden />
            </span>
          </p>
        </div>

        {FREELANCER_LISTINGS.map((freelancer) => (
          <FreelancerCard key={freelancer.id} freelancer={freelancer} />
        ))}

        <nav
          className="my-10 flex justify-center space-x-1"
          aria-label="Pagination"
        >
          <button
            type="button"
            className="border border-gray-300 px-3 py-1 text-sm text-gray-400"
            aria-label="Previous page"
          >
            &lt;
          </button>
          {PAGINATION_PAGES.map((page) => (
            <button
              key={page}
              type="button"
              className={`border px-3 py-1 text-sm ${
                page === 1
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 text-blue-600"
              }`}
              aria-current={page === 1 ? "page" : undefined}
            >
              {page}
            </button>
          ))}
          <span className="px-2 py-1 text-gray-500" aria-hidden>
            ...
          </span>
          <button
            type="button"
            className="border border-gray-300 px-3 py-1 text-sm text-blue-600"
          >
            100
          </button>
          <button
            type="button"
            className="border border-gray-300 px-3 py-1 text-sm text-blue-600"
            aria-label="Next page"
          >
            &gt;
          </button>
        </nav>

        <div className="mb-10 text-center">
          <p className="mb-4 font-bold text-gray-800">
            Browse 3 Million+ Professional Services to Get Your Job Done
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {BROWSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className="flex items-center rounded-sm border border-gray-300 px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
              >
                <FaThLarge className="mr-2 text-gray-400" aria-hidden />
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
