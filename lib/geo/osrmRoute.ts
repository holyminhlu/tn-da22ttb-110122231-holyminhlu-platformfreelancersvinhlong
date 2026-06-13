import type { GeoPoint } from "./jobLocation";

export type DrivingRouteSummary = {
  distanceKm: number;
  durationMinutes: number;
  source: "osrm";
};

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/** Tuyến lái xe qua OSRM demo (lon,lat). Trả null nếu không tìm được tuyến. */
export async function fetchDrivingRoute(
  from: GeoPoint,
  to: GeoPoint,
): Promise<DrivingRouteSummary | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE}/${coords}?overview=false&alternatives=false&steps=false`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    code?: string;
    routes?: { distance?: number; duration?: number }[];
  };

  if (data.code !== "Ok" || !data.routes?.[0]) return null;

  const route = data.routes[0];
  const distanceKm = Number(route.distance) / 1000;
  const durationMinutes = Math.max(1, Math.round(Number(route.duration) / 60));

  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationMinutes)) return null;

  return { distanceKm, durationMinutes, source: "osrm" };
}
