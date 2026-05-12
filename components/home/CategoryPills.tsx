import Link from "next/link";
import { QUICK_CATEGORIES } from "@/components/home/data";
import { CategoryGlyph } from "@/components/home/icons";
import { HOME_A11Y } from "@/components/home/theme";

export default function CategoryPills() {
  return (
    <section className="border-b border-zinc-100 bg-white px-4 pb-8 pt-10 sm:px-6" aria-labelledby="categories-heading">
      <div className="mx-auto max-w-6xl">
        <h2 id="categories-heading" className="sr-only">
          Danh mục nhanh
        </h2>
        <p className="mb-4 text-sm font-semibold text-brand-navy">Danh mục phổ biến</p>
        <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-2 sm:-mx-6 sm:px-6">
          {QUICK_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/tim-kiem?category=${encodeURIComponent(cat.id)}`}
              className={`group flex shrink-0 snap-start items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/80 py-2.5 pl-3 pr-4 text-sm font-medium text-zinc-800 shadow-sm transition-all duration-300 hover:border-brand-green/50 hover:bg-brand-green/5 ${HOME_A11Y.softHoverOnLight} hover:shadow-md hover:-translate-y-0.5 ${HOME_A11Y.focusRing} active:scale-[0.98]`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-green ring-1 ring-zinc-100 transition-colors duration-300 group-hover:bg-brand-green/10 group-hover:text-brand-navy">
                <CategoryGlyph id={cat.id} className="h-4 w-4" />
              </span>
              {cat.label}
              <span className="text-zinc-400 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
