import { REMOTE_WORK_LOCATION_LABEL } from "@/lib/hire/workLocation";

export type GeoPoint = { lat: number; lng: number };

export function isRemoteJobLocation(label: string | null | undefined): boolean {
  const trimmed = String(label || "").trim();
  if (!trimmed) return false;
  if (trimmed === REMOTE_WORK_LOCATION_LABEL) return true;
  const lower = trimmed.toLowerCase();
  return lower.includes("remote") || lower.includes("làm tại nhà");
}

export function parseGeoPoint(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): GeoPoint | null {
  const latNum = lat != null && lat !== "" ? Number(lat) : NaN;
  const lngNum = lng != null && lng !== "" ? Number(lng) : NaN;
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  return { lat: latNum, lng: lngNum };
}

export function isOnsiteJob(job: {
  location_label?: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
}): boolean {
  if (isRemoteJobLocation(job.location_label)) return false;
  const hasLabel = Boolean(String(job.location_label || "").trim());
  const hasCoords = parseGeoPoint(job.location_lat, job.location_lng) != null;
  return hasLabel || hasCoords;
}

export function jobSitePoint(job: {
  location_lat?: number | string | null;
  location_lng?: number | string | null;
}): GeoPoint | null {
  return parseGeoPoint(job.location_lat, job.location_lng);
}
