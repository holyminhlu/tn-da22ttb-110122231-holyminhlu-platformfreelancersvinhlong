import { CATEGORIES } from "./data";
import { CategoryIcon } from "./icons";

function CategoryCard({
  icon,
  title,
  count,
}: {
  icon: (typeof CATEGORIES)[number]["icon"];
  title: string;
  count: string;
}) {
  return (
    <div className="flex cursor-pointer flex-col items-center rounded border border-gray-100 bg-white p-8 text-center transition hover:shadow-lg">
      <CategoryIcon name={icon} className="mb-4 text-4xl text-blue-500" />
      <h3 className="mb-1 font-bold text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500">{count} Freelancers</p>
    </div>
  );
}

export default function HomeCategories() {
  return (
    <section id="categories" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-bold">Find Top Freelancers</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((item) => (
            <CategoryCard key={item.title} {...item} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <button
            type="button"
            className="rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            See All Skills
          </button>
        </div>
      </div>
    </section>
  );
}
