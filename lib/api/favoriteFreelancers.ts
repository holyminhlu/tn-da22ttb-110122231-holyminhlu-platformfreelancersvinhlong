import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type FavoriteFreelancerToggleResult = {
  message: string;
  isFavorite: boolean;
  favoriteCount: number;
};

export async function listFavoriteFreelancerIds() {
  const { data } = await fetchApi<{ freelancerIds: string[] }>(apiPaths.users.favoriteFreelancerIds, {
    auth: true,
  });
  return data.freelancerIds ?? [];
}

export async function syncFavoriteFreelancers(freelancerIds: string[]) {
  const { data } = await fetchApi<{ synced: number; freelancerIds: string[] }>(
    apiPaths.users.favoriteFreelancersSync,
    {
      method: "POST",
      auth: true,
      body: { freelancerIds },
    },
  );
  return data;
}

export async function addFavoriteFreelancer(freelancerId: string) {
  const { data } = await fetchApi<FavoriteFreelancerToggleResult>(
    apiPaths.users.favoriteFreelancer(freelancerId),
    { method: "POST", auth: true },
  );
  return data;
}

export async function removeFavoriteFreelancer(freelancerId: string) {
  const { data } = await fetchApi<FavoriteFreelancerToggleResult>(
    apiPaths.users.favoriteFreelancer(freelancerId),
    { method: "DELETE", auth: true },
  );
  return data;
}
