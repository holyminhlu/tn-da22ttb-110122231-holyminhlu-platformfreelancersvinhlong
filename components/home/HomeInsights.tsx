import Image from "next/image";
import { INSIGHT_POSTS } from "./data";

export default function HomeInsights() {
  return (
    <section className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">VLC Insights</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {INSIGHT_POSTS.map((post) => (
            <article
              key={post.title}
              className="flex h-full cursor-pointer flex-col overflow-hidden rounded bg-white shadow-sm transition hover:shadow-md"
            >
              <Image
                src={post.img}
                alt={post.title}
                width={400}
                height={192}
                className="h-48 w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-6">
                <p className="mb-2 text-xs font-medium text-gray-400">{post.date}</p>
                <h3 className="mb-4 text-sm font-bold leading-tight transition hover:text-blue-600">
                  {post.title}
                </h3>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <button
            type="button"
            className="rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            View Blog
          </button>
        </div>
      </div>
    </section>
  );
}
