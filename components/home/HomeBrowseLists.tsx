import { TOP_LOCATIONS, TOP_SKILLS } from "./data";

export default function HomeBrowseLists() {
  return (
    <section className="border-b border-gray-100 bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">Browse Freelancers</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>

        <div className="mb-20">
          <h3 className="mb-10 text-center font-bold">Top Skills</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs text-gray-500 md:grid-cols-4">
            {TOP_SKILLS.map((skill) => (
              <div key={skill} className="cursor-pointer hover:text-blue-600">
                {skill}
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <button
              type="button"
              className="rounded border border-blue-500 px-8 py-2 text-sm font-bold text-blue-500 transition hover:bg-blue-50"
            >
              Browse All Skills
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-10 text-center font-bold">Top Locations</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs text-gray-500 md:grid-cols-4">
            {TOP_LOCATIONS.map((loc) => (
              <div key={loc} className="cursor-pointer hover:text-blue-600">
                {loc}
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <button
              type="button"
              className="rounded border border-blue-500 px-8 py-2 text-sm font-bold text-blue-500 transition hover:bg-blue-50"
            >
              Browse All Locations
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
