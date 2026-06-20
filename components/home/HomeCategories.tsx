import { tUi } from "@/lib/i18n/runtime";
import Link from "next/link";
import { getTopSkills } from "@/lib/api/freelancers";
import { CategoryIcon } from "./icons";
import { getSkillIconKey } from "./skillIcon";
import type { CategoryIconKey } from "./types";

function CategoryCard({
  icon,
  title,
  count,
  href,
}: {
  icon: CategoryIconKey;
  title: string;
  count: number;
  href: string;
}) {
  const t = tUi;
  const countLabel = count.toLocaleString("vi-VN");

  return (
    <Link
      href={href}
      className="flex flex-col items-center rounded border border-gray-100 bg-white p-8 text-center transition hover:shadow-lg"
    >
      <CategoryIcon name={icon} className="mb-4 text-4xl text-blue-500" />
      <h3 className="mb-1 font-bold text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500">{countLabel} freelancer</p>
    </Link>
  );
}

export default async function HomeCategories() {
  const t = tUi;
  let skills: { name: string; freelancerCount: number }[] = [];

  try {
    const data = await getTopSkills(9);
    skills = data.skills ?? [];
  } catch {
    skills = [];
  }

  return (
    <section id="categories" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-bold">Kỹ năng nổi bật</h2>
          <p className="text-sm text-gray-500">Freelancer theo kỹ năng phổ biến nhất trên nền tảng</p>
          <div className="mx-auto mt-4 h-1 w-12 bg-blue-500" />
        </div>

        {skills.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((item, index) => (
              <CategoryCard
                key={item.name}
                icon={getSkillIconKey(item.name, index)}
                title={item.name}
                count={item.freelancerCount}
                href={`/freelancers?skill=${encodeURIComponent(item.name)}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Chưa có dữ liệu kỹ năng. Freelancer có thể thêm kỹ năng trong hồ sơ của mình.
          </p>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/freelancers"
            className="inline-block rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            Xem tất cả kỹ năng
          </Link>
        </div>
      </div>
    </section>
  );
}
