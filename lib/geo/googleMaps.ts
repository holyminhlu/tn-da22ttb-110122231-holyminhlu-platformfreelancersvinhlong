import type { GeoPoint } from "./jobLocation";
import { VINH_LONG_MAP_CENTER } from "./vinhLongBounds";

export const GOOGLE_ROUTE_STROKE_COLOR = "#DC2626";

export function googleMapsDirectionsUrl(from: GeoPoint, to: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;
}

export function googleMapsPlaceUrl(point: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}

/** iframe Embed API — fallback khi Maps JavaScript API bị từ chối referrer/quyền. */
export function googleMapsEmbedUrl(
  apiKey: string,
  origin?: GeoPoint | null,
  destination?: GeoPoint | null,
): string {
  const key = encodeURIComponent(apiKey);

  if (origin && destination) {
    return (
      "https://www.google.com/maps/embed/v1/directions" +
      `?key=${key}` +
      `&origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      "&mode=driving"
    );
  }

  const point = destination ?? origin;
  if (point) {
    return (
      "https://www.google.com/maps/embed/v1/view" +
      `?key=${key}` +
      `&center=${point.lat},${point.lng}` +
      "&zoom=14"
    );
  }

  return (
    "https://www.google.com/maps/embed/v1/view" +
    `?key=${key}` +
    `&center=${VINH_LONG_MAP_CENTER.lat},${VINH_LONG_MAP_CENTER.lng}` +
    `&zoom=${VINH_LONG_MAP_CENTER.zoom}`
  );
}

export const GOOGLE_MAPS_REFERRER_HINT =
  "Thêm referrer trong Google Cloud → Credentials → API key: http://localhost:3000/*, http://127.0.0.1:3000/* và IP máy bạn (vd. http://192.168.18.1:3000/*). Bật Maps JavaScript API, Directions API, Maps Embed API và Billing.";
