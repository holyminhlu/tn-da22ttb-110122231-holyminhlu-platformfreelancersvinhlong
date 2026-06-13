import { VINH_LONG_MAP_CENTER } from "./vinhLongBounds";
import type { GeoPoint } from "./jobLocation";

export function osmEmbedBboxUrl(points: GeoPoint[], padding = 0.012): string {
  if (points.length === 0) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${
      VINH_LONG_MAP_CENTER.lng - 0.08
    }%2C${VINH_LONG_MAP_CENTER.lat - 0.06}%2C${
      VINH_LONG_MAP_CENTER.lng + 0.08
    }%2C${VINH_LONG_MAP_CENTER.lat + 0.06}&layer=mapnik&marker=${
      VINH_LONG_MAP_CENTER.lat
    }%2C${VINH_LONG_MAP_CENTER.lng}`;
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats) - padding;
  const maxLat = Math.max(...lats) + padding;
  const minLon = Math.min(...lngs) - padding;
  const maxLon = Math.max(...lngs) + padding;
  const primary = points[0];

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${primary.lat}%2C${primary.lng}`;
}

export function osmDirectionsUrl(from: GeoPoint, to: GeoPoint): string {
  return `https://www.openstreetmap.org/directions?from=${from.lat}%2C${from.lng}&to=${to.lat}%2C${to.lng}`;
}
