import { VINH_LONG_BBOX } from "./vinhLongBounds";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "vl-connected/1.0 (contact-verification; educational)";

export type NominatimAddress = {
  road?: string;
  house_number?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

export type NominatimReverseResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
};

export type NominatimSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

async function nominatimFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${NOMINATIM_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "vi",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error("Không thể tra cứu địa chỉ (OpenStreetMap).");
  }
  return (await res.json()) as T;
}

export async function reverseGeocode(lat: number, lon: number): Promise<NominatimReverseResult> {
  return nominatimFetch<NominatimReverseResult>("/reverse", {
    lat: String(lat),
    lon: String(lon),
    format: "json",
    addressdetails: "1",
    "accept-language": "vi",
  });
}

export async function searchAddressInVinhLong(query: string, limit = 6): Promise<NominatimSearchResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const { minLon, minLat, maxLon, maxLat } = VINH_LONG_BBOX;
  const data = await nominatimFetch<NominatimSearchResult[]>("/search", {
    q: `${q}, Vĩnh Long, Việt Nam`,
    format: "json",
    addressdetails: "1",
    limit: String(limit),
    countrycodes: "vn",
    viewbox: `${minLon},${maxLat},${maxLon},${minLat}`,
    bounded: "1",
    "accept-language": "vi",
  });
  return Array.isArray(data) ? data : [];
}

export function formatStreetFromNominatim(addr?: NominatimAddress): string {
  if (!addr) return "";
  const parts = [addr.house_number, addr.road].filter(Boolean);
  return parts.join(" ").trim();
}

export function formatLocalityFromNominatim(addr?: NominatimAddress): string {
  if (!addr) return "";
  return (
    addr.village ||
    addr.suburb ||
    addr.town ||
    addr.municipality ||
    addr.city ||
    addr.county ||
    ""
  ).trim();
}
