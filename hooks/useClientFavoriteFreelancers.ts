"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addFavoriteFreelancer,
  listFavoriteFreelancerIds,
  removeFavoriteFreelancer,
  syncFavoriteFreelancers,
  type FavoriteFreelancerToggleResult,
} from "@/lib/api/favoriteFreelancers";
import {
  readFavoriteFreelancerIds,
  writeFavoriteFreelancerIds,
} from "@/lib/hire/favoriteFreelancersStorage";

type UseClientFavoriteFreelancersOptions = {
  enabled?: boolean;
};

export function useClientFavoriteFreelancers(options: UseClientFavoriteFreelancersOptions = {}) {
  const { enabled = true } = options;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const localIds = readFavoriteFreelancerIds();
        if (localIds.length > 0) {
          const synced = await syncFavoriteFreelancers(localIds);
          if (!cancelled) {
            setFavoriteIds(new Set(synced.freelancerIds));
            writeFavoriteFreelancerIds([]);
          }
        } else {
          const ids = await listFavoriteFreelancerIds();
          if (!cancelled) setFavoriteIds(new Set(ids));
        }
      } catch {
        if (!cancelled) {
          setFavoriteIds(new Set(readFavoriteFreelancerIds()));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const isFavorite = useCallback((freelancerId: string) => favoriteIds.has(freelancerId), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (freelancerId: string): Promise<FavoriteFreelancerToggleResult> => {
      const wasFavorite = favoriteIds.has(freelancerId);

      const result = wasFavorite
        ? await removeFavoriteFreelancer(freelancerId)
        : await addFavoriteFreelancer(freelancerId);

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (result.isFavorite) next.add(freelancerId);
        else next.delete(freelancerId);
        return next;
      });

      return result;
    },
    [favoriteIds],
  );

  return {
    favoriteIds,
    ready,
    isFavorite,
    toggleFavorite,
  };
}
