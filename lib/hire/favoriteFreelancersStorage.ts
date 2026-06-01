const STORAGE_KEY = "vlc_favorite_freelancer_ids";

export function readFavoriteFreelancerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id)).filter(Boolean);
  } catch {
    return [];
  }
}

export function writeFavoriteFreelancerIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  const unique = [...new Set(ids.map((id) => String(id)).filter(Boolean))];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function toggleFavoriteFreelancerId(id: string): boolean {
  const ids = readFavoriteFreelancerIds();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  writeFavoriteFreelancerIds(next);
  return next.includes(id);
}

export function isFavoriteFreelancerId(id: string): boolean {
  return readFavoriteFreelancerIds().includes(id);
}
