const VINH_LONG_CENTER = { lat: 10.239, lng: 105.957, zoom: 10 };
const ROUTE_COLOR = "0xdc2626ff";

function getMapsApiKey() {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === "your-google-maps-api-key") return null;
  return key;
}

function parseCoord(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildStaticMapUrl({ markers, pathEnc, pathRaw, center, zoom = 12 }) {
  const key = getMapsApiKey();
  if (!key) {
    const err = new Error("MAPS_NOT_CONFIGURED");
    err.code = "MAPS_NOT_CONFIGURED";
    throw err;
  }

  const params = new URLSearchParams({
    size: "640x320",
    scale: "2",
    maptype: "roadmap",
    key,
  });

  if (center) {
    params.set("center", `${center.lat},${center.lng}`);
    params.set("zoom", String(zoom));
  }

  for (const marker of markers) {
    params.append("markers", marker);
  }

  if (pathEnc) {
    params.append("path", `color:${ROUTE_COLOR}|weight:5|enc:${pathEnc}`);
  } else if (pathRaw) {
    params.append("path", `color:${ROUTE_COLOR}|weight:5|${pathRaw}`);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

async function fetchDirectionsPolyline(fromLat, fromLng, toLat, toLng) {
  const key = getMapsApiKey();
  const url =
    "https://maps.googleapis.com/maps/api/directions/json" +
    `?origin=${fromLat},${fromLng}` +
    `&destination=${toLat},${toLng}` +
    "&mode=driving" +
    `&key=${encodeURIComponent(key)}`;

  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    const err = new Error("Không gọi được Directions API.");
    err.code = "DIRECTIONS_HTTP_ERROR";
    throw err;
  }

  if (payload.status === "OK" && payload.routes?.[0]?.overview_polyline?.points) {
    return payload.routes[0].overview_polyline.points;
  }

  if (payload.error_message) {
    console.warn("[maps] Directions API:", payload.status, payload.error_message);
  }

  return null;
}

async function fetchImageBuffer(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    const text = (await response.text()).trim();
    const err = new Error(
      text.slice(0, 240) || `Static Maps trả về ${response.status}.`,
    );
    err.code = "STATIC_MAP_ERROR";
    throw err;
  }
  return Buffer.from(await response.arrayBuffer());
}

function summarizeGoogleError(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("billing")) {
    return (
      "Google vẫn báo Billing chưa bật cho project của API key này. " +
      "Vào Google Cloud → chọn đúng project tạo API key → Billing → gắn tài khoản thanh toán. " +
      "Sau đó mở Maps Platform Overview và bấm Enable."
    );
  }
  if (text.includes("not authorized") || text.includes("not enabled")) {
    return "API key chưa được phép dùng Maps Static API / Directions API. Bật 2 API này trong API Library.";
  }
  return message || "Google Maps từ chối yêu cầu.";
}

async function checkMapsHealth() {
  const key = getMapsApiKey();
  if (!key) {
    return {
      ok: false,
      configured: false,
      message: "Chưa cấu hình GOOGLE_MAPS_API_KEY trong .env",
    };
  }

  const directionsRes = await fetch(
    "https://maps.googleapis.com/maps/api/directions/json" +
      "?origin=10.239,105.957&destination=10.25,105.97&mode=driving" +
      `&key=${encodeURIComponent(key)}`,
  );
  const directions = await directionsRes.json().catch(() => null);

  const staticRes = await fetch(
    "https://maps.googleapis.com/maps/api/staticmap?size=100x100&center=10.239,105.957&zoom=10" +
      `&key=${encodeURIComponent(key)}`,
  );
  const staticText = staticRes.ok ? "" : (await staticRes.text()).trim();

  const directionsOk = directions?.status === "OK";
  const staticOk = staticRes.ok;

  const issues = [];
  if (!directionsOk) {
    issues.push(
      summarizeGoogleError(directions?.error_message || directions?.status || "Directions lỗi"),
    );
  }
  if (!staticOk) {
    issues.push(summarizeGoogleError(staticText));
  }

  return {
    ok: directionsOk && staticOk,
    configured: true,
    directions: {
      ok: directionsOk,
      status: directions?.status || "UNKNOWN",
      message: directions?.error_message || null,
    },
    staticMap: {
      ok: staticOk,
      status: staticRes.status,
      message: staticOk ? null : staticText.slice(0, 240),
    },
    message: issues.length ? issues.join(" ") : "Google Maps sẵn sàng.",
  };
}

async function buildRoutePreviewImage(query) {
  const fromLat = parseCoord(query.fromLat);
  const fromLng = parseCoord(query.fromLng);
  const toLat = parseCoord(query.toLat);
  const toLng = parseCoord(query.toLng);
  const centerLat = parseCoord(query.centerLat);
  const centerLng = parseCoord(query.centerLng);

  const hasRoute =
    fromLat != null && fromLng != null && toLat != null && toLng != null;

  if (hasRoute) {
    let polyline = null;
    try {
      polyline = await fetchDirectionsPolyline(fromLat, fromLng, toLat, toLng);
    } catch (error) {
      if (error.code !== "DIRECTIONS_HTTP_ERROR") throw error;
    }

    const markers = [
      `color:blue|label:A|${fromLat},${fromLng}`,
      `color:green|label:B|${toLat},${toLng}`,
    ];

    let staticUrl;
    if (polyline) {
      staticUrl = buildStaticMapUrl({ markers, pathEnc: polyline });
    } else {
      staticUrl = buildStaticMapUrl({
        markers,
        pathRaw: `${fromLat},${fromLng}|${toLat},${toLng}`,
        center: { lat: (fromLat + toLat) / 2, lng: (fromLng + toLng) / 2 },
        zoom: 11,
      });
    }

    return fetchImageBuffer(staticUrl);
  }

  const center =
    centerLat != null && centerLng != null
      ? { lat: centerLat, lng: centerLng }
      : VINH_LONG_CENTER;

  const staticUrl = buildStaticMapUrl({
    markers: centerLat != null && centerLng != null ? [`color:red|${center.lat},${center.lng}`] : [],
    center,
    zoom: centerLat != null && centerLng != null ? 14 : VINH_LONG_CENTER.zoom,
  });

  return fetchImageBuffer(staticUrl);
}

module.exports = {
  buildRoutePreviewImage,
  checkMapsHealth,
  getMapsApiKey,
};
