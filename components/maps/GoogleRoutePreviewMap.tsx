"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useMemo, useState } from "react";
import type { GeoPoint } from "@/lib/geo/jobLocation";
import { googleMapsDirectionsUrl } from "@/lib/geo/googleMaps";
import { osmEmbedUrl } from "@/lib/geo/vinhLongBounds";
import { buildMapsRoutePreviewUrl, fetchMapsHealth } from "@/lib/api/mapsRoutePreview";
import "./google-route-preview.css";

type GoogleRoutePreviewMapProps = {
  origin?: GeoPoint | null;
  destination?: GeoPoint | null;
  originLabel?: string;
  destinationLabel?: string;
  fallbackCenter?: GeoPoint;
  fallbackZoom?: number;
  className?: string;
  mapHeight?: number;
};

export default function GoogleRoutePreviewMap({
  origin,
  destination,
  originLabel = "Điểm A",
  destinationLabel = "Điểm B",
  fallbackCenter,
  fallbackZoom = 10,
  className,
  mapHeight = 220,
}: GoogleRoutePreviewMapProps) {
  const { t } = useTranslation();

  const [googleReady, setGoogleReady] = useState<boolean | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const showRoute = Boolean(origin && destination);
  const previewUrl = useMemo(
    () => buildMapsRoutePreviewUrl({ origin, destination, fallbackCenter, fallbackZoom }),
    [origin, destination, fallbackCenter, fallbackZoom],
  );

  const osmFallbackUrl = useMemo(() => {
    const point = destination ?? origin ?? fallbackCenter;
    if (point) return osmEmbedUrl(point.lat, point.lng, destination ? 14 : fallbackZoom);
    return null;
  }, [destination, origin, fallbackCenter, fallbackZoom]);

  useEffect(() => {
    let cancelled = false;
    setGoogleReady(null);
    setImageFailed(false);

    fetchMapsHealth()
      .then((status) => {
        if (cancelled) return;
        setGoogleReady(status.ok);
      })
      .catch(() => {
        if (cancelled) return;
        setGoogleReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  const rootClass = ["google-route-preview", className].filter(Boolean).join(" ");
  const useOsm = googleReady === false || imageFailed;

  if (useOsm && osmFallbackUrl) {
    return (
      <div className={rootClass}>
        <iframe
          title="Bản đồ tham chiếu OpenStreetMap"
          className="google-route-preview__osm"
          src={osmFallbackUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ height: mapHeight }}
        />
      </div>
    );
  }

  return (
    <div className={rootClass}>
      {googleReady === null ? (
        <div
          className="google-route-preview__image google-route-preview__image--loading"
          style={{ height: mapHeight }}
        >
          Đang kiểm tra Google Maps...
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={previewUrl}
          alt={
            showRoute
              ? `Bản đồ tuyến đường từ ${originLabel} đến ${destinationLabel}`
              : "Bản đồ tham chiếu Vĩnh Long"
          }
          className="google-route-preview__image"
          style={{ height: mapHeight }}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}

      {showRoute && googleReady ? (
        <div className="google-route-preview__legend">
          <span className="google-route-preview__legend-item google-route-preview__legend-item--a">
            A · {originLabel}
          </span>
          <span className="google-route-preview__legend-item google-route-preview__legend-item--b">
            B · {destinationLabel}
          </span>
          <span className="google-route-preview__legend-route">Tuyến màu đỏ</span>
        </div>
      ) : null}

      {showRoute && googleReady ? (
        <a
          href={googleMapsDirectionsUrl(origin!, destination!)}
          target="_blank"
          rel="noopener noreferrer"
          className="google-route-preview__link"
        >
          Mở chỉ đường trên Google Maps
        </a>
      ) : null}
    </div>
  );
}
