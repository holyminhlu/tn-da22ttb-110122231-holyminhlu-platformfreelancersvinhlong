import type { MyWorkClientJob } from "@/lib/api/contracts";
import type { FreelancerDetail } from "@/lib/api/freelancers";
import type { HireFavoriteEntry, HireFavoriteSource } from "./hireFavoritesTypes";

function mergeEntry(
  map: Map<string, HireFavoriteEntry>,
  id: string,
  patch: Partial<HireFavoriteEntry> & { sources?: HireFavoriteSource[] },
) {
  const prev = map.get(id);
  const sources = new Set<HireFavoriteSource>([...(prev?.sources ?? []), ...(patch.sources ?? [])]);
  map.set(id, {
    id,
    name: patch.name ?? prev?.name ?? "Freelancer",
    email: patch.email ?? prev?.email ?? null,
    title: patch.title ?? prev?.title ?? null,
    avatarUrl: patch.avatarUrl ?? prev?.avatarUrl ?? null,
    districtCity: patch.districtCity ?? prev?.districtCity ?? null,
    hourlyRate: patch.hourlyRate ?? prev?.hourlyRate ?? null,
    ratingAvg: patch.ratingAvg ?? prev?.ratingAvg ?? null,
    totalReviews: patch.totalReviews ?? prev?.totalReviews ?? null,
    skills: patch.skills?.length ? patch.skills : (prev?.skills ?? []),
    lastJobTitle: patch.lastJobTitle ?? prev?.lastJobTitle ?? null,
    lastWorkedAt: patch.lastWorkedAt ?? prev?.lastWorkedAt ?? null,
    featuredServiceId: patch.featuredServiceId ?? prev?.featuredServiceId ?? null,
    sources: [...sources],
  });
}

export function entriesFromWorkedJobs(jobs: MyWorkClientJob[]): HireFavoriteEntry[] {
  const map = new Map<string, HireFavoriteEntry>();

  for (const job of jobs) {
    const id = job.freelancer_id;
    if (!id) continue;

    const workedAt = job.job_updated_at || job.job_created_at;
    const prev = map.get(id);
    const useJob =
      !prev?.lastWorkedAt || (workedAt && new Date(workedAt) >= new Date(prev.lastWorkedAt));

    mergeEntry(map, id, {
      sources: ["worked"],
      name: job.freelancer_name || job.freelancer_email || "Freelancer",
      email: job.freelancer_email,
      lastJobTitle: useJob ? job.title : prev?.lastJobTitle,
      lastWorkedAt: useJob ? workedAt : prev?.lastWorkedAt,
    });
  }

  return [...map.values()].sort((a, b) => {
    const ta = a.lastWorkedAt ? new Date(a.lastWorkedAt).getTime() : 0;
    const tb = b.lastWorkedAt ? new Date(b.lastWorkedAt).getTime() : 0;
    return tb - ta;
  });
}

export function applyFreelancerProfile(entry: HireFavoriteEntry, profile: FreelancerDetail): HireFavoriteEntry {
  return {
    ...entry,
    name: profile.full_name || entry.name,
    title: profile.title || entry.title,
    avatarUrl: profile.avatar_url ?? entry.avatarUrl,
    districtCity: profile.district_city || entry.districtCity,
    hourlyRate: profile.hourly_rate ?? entry.hourlyRate,
    ratingAvg: profile.rating_avg ?? entry.ratingAvg,
    totalReviews: profile.total_reviews ?? entry.totalReviews,
    skills: profile.skills?.length ? profile.skills : entry.skills,
    completedJobs: profile.completed_jobs ?? entry.completedJobs ?? 0,
    featuredServiceId: profile.featured_service_id ?? entry.featuredServiceId,
  };
}

export function mergeFavoriteIds(
  worked: HireFavoriteEntry[],
  favoriteIds: string[],
): HireFavoriteEntry[] {
  const map = new Map<string, HireFavoriteEntry>();
  for (const entry of worked) {
    map.set(entry.id, { ...entry });
  }
  for (const id of favoriteIds) {
    if (map.has(id)) {
      const entry = map.get(id)!;
      if (!entry.sources.includes("favorite")) {
        entry.sources = [...entry.sources, "favorite"];
      }
    } else {
      map.set(id, {
        id,
        name: "Freelancer",
        email: null,
        title: null,
        avatarUrl: null,
        districtCity: null,
        hourlyRate: null,
        ratingAvg: null,
        totalReviews: null,
        skills: [],
        lastJobTitle: null,
        lastWorkedAt: null,
        featuredServiceId: null,
        sources: ["favorite"],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function filterFavoriteEntries(
  entries: HireFavoriteEntry[],
  tab: "all" | "worked" | "favorites",
  query: string,
): HireFavoriteEntry[] {
  let list = entries;
  if (tab === "worked") list = list.filter((e) => e.sources.includes("worked"));
  if (tab === "favorites") list = list.filter((e) => e.sources.includes("favorite"));

  const q = query.trim().toLowerCase();
  if (!q) return list;

  return list.filter((e) => {
    const haystack = [e.name, e.email, e.title, e.districtCity, e.lastJobTitle, ...e.skills]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
