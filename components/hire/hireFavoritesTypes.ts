export type HireFavoriteSource = "worked" | "favorite";

export type HireFavoriteEntry = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  avatarUrl: string | null;
  districtCity: string | null;
  hourlyRate: string | number | null;
  ratingAvg: number | null;
  totalReviews: number | null;
  skills: string[];
  completedJobs?: number;
  lastJobTitle: string | null;
  lastWorkedAt: string | null;
  featuredServiceId: string | null;
  sources: HireFavoriteSource[];
};
