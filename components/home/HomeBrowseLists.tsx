import { tUi } from "@/lib/i18n/runtime";
import Link from "next/link";
import { getTopLocations, getTopSkills } from "@/lib/api/freelancers";

export default async function HomeBrowseLists() {
  const t = tUi;
  let skills: { name: string; freelancerCount: number }[] = [];
  let locations: { name: string; freelancerCount: number }[] = [];

  try {
    const [skillsData, locationsData] = await Promise.all([getTopSkills(48), getTopLocations(16)]);
    skills = skillsData.skills ?? [];
    locations = locationsData.locations ?? [];
  } catch {
    skills = [];
    locations = [];
  }

  return (
    <section className="border-b border-gray-100 bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">Duyệt freelancer</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>

        <div className="mb-20">
          <h3 className="mb-10 text-center font-bold">Kỹ năng hàng đầu</h3>
          {skills.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs text-gray-500 md:grid-cols-4">
              {skills.map((skill) => (
                <Link
                  key={skill.name}
                  href={`/freelancers?skill=${encodeURIComponent(skill.name)}`}
                  className="transition hover:text-blue-600"
                  title={`${skill.freelancerCount} freelancer`}
                >
                  {skill.name}
                  <span className="ml-1 text-gray-400">({skill.freelancerCount})</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Chưa có dữ liệu kỹ năng từ freelancer trên nền tảng.
            </p>
          )}
          <div className="mt-12 text-center">
            <Link
              href="/freelancers"
              className="inline-block rounded border border-blue-500 px-8 py-2 text-sm font-bold text-blue-500 transition hover:bg-blue-50"
            >
              Xem tất cả kỹ năng
            </Link>
          </div>
        </div>

        <div>
          <h3 className="mb-10 text-center font-bold">Địa điểm hàng đầu</h3>
          {locations.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs text-gray-500 md:grid-cols-4">
              {locations.map((location) => (
                <Link
                  key={location.name}
                  href={`/freelancers?district=${encodeURIComponent(location.name)}`}
                  className="transition hover:text-blue-600"
                  title={`${location.freelancerCount} freelancer`}
                >
                  Freelancer tại {location.name}
                  <span className="ml-1 text-gray-400">({location.freelancerCount})</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Chưa có dữ liệu địa điểm từ freelancer trên nền tảng.
            </p>
          )}
          <div className="mt-12 text-center">
            <Link
              href="/freelancers"
              className="inline-block rounded border border-blue-500 px-8 py-2 text-sm font-bold text-blue-500 transition hover:bg-blue-50"
            >
              Xem tất cả địa điểm
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
