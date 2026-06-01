/** Bounding box tỉnh Vĩnh Long (mới, sau sáp nhập 2025) — xấp xỉ cho geocode & bản đồ. */
export const VINH_LONG_BBOX = {
  minLat: 9.45,
  maxLat: 10.55,
  minLon: 105.85,
  maxLon: 106.65,
} as const;

export const VINH_LONG_MAP_CENTER = {
  lat: 10.239,
  lng: 105.957,
  zoom: 10,
} as const;

export function isInsideVinhLongBbox(lat: number, lon: number): boolean {
  return (
    lat >= VINH_LONG_BBOX.minLat &&
    lat <= VINH_LONG_BBOX.maxLat &&
    lon >= VINH_LONG_BBOX.minLon &&
    lon <= VINH_LONG_BBOX.maxLon
  );
}

export function osmEmbedUrl(lat: number, lon: number, zoom = 15): string {
  const delta = 0.02 / Math.max(zoom / 14, 1);
  const left = lon - delta;
  const right = lon + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
}
