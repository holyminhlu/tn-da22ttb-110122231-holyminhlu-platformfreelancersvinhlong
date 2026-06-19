import { apiUrl } from "@/config/api.config";
import type { GeoPoint } from "@/lib/geo/jobLocation";
import { VINH_LONG_MAP_CENTER } from "@/lib/geo/vinhLongBounds";

export type MapsHealthStatus = {
  ok: boolean;
  configured?: boolean;
  message?: string;
  directions?: { ok: boolean; status: string; message: string | null };
  staticMap?: { ok: boolean; status: number; message: string | null };
};

type RoutePreviewParams = {
  origin?: GeoPoint | null;
  destination?: GeoPoint | null;
  fallbackCenter?: GeoPoint;
  fallbackZoom?: number;
};

export function buildMapsRoutePreviewUrl({
  origin,
  destination,
  fallbackCenter,
}: RoutePreviewParams): string {
  const params = new URLSearchParams();

  if (origin && destination) {
    params.set("fromLat", String(origin.lat));
    params.set("fromLng", String(origin.lng));
    params.set("toLat", String(destination.lat));
    params.set("toLng", String(destination.lng));
    return apiUrl(`/api/maps/route-preview?${params.toString()}`);
  }

  const center = destination ?? origin ?? fallbackCenter ?? {
    lat: VINH_LONG_MAP_CENTER.lat,
    lng: VINH_LONG_MAP_CENTER.lng,
  };

  params.set("centerLat", String(center.lat));
  params.set("centerLng", String(center.lng));
  return apiUrl(`/api/maps/route-preview?${params.toString()}`);
}

export async function fetchMapsHealth(): Promise<MapsHealthStatus> {
  const response = await fetch(apiUrl("/api/maps/status"), { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as MapsHealthStatus | null;
  if (!payload) {
    return { ok: false, message: "Không kiểm tra được Google Maps." };
  }
  return payload;
}
