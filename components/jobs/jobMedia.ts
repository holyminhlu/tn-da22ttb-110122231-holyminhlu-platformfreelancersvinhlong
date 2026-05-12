/** Chuẩn hóa mảng URL ảnh từ API (jsonb / JSON string). */
export function parseJobImages(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean).slice(0, 3);
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p.map(String).filter(Boolean).slice(0, 3) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** URL hiển thị: đường dẫn upload API hoặc URL tuyệt đối. */
export function resolveJobImageUrl(url: string, apiBaseUrl: string): string {
  const u = String(url || "").trim();
  if (!u) return "";
  const base = apiBaseUrl.replace(/\/$/, "");
  if (u.startsWith("/uploads/")) return `${base}${u}`;
  return u;
}
