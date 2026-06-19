/** Google Maps — key public (NEXT_PUBLIC_) dùng trên trình duyệt. */
export function getGoogleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === "your-google-maps-api-key") return null;
  return key;
}

export function isGoogleMapsConfigured(): boolean {
  return getGoogleMapsApiKey() != null;
}
