"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoPoint } from "@/lib/geo/jobLocation";
import {
  GOOGLE_ROUTE_STROKE_COLOR,
  googleMapsDirectionsUrl,
  googleMapsEmbedUrl,
} from "@/lib/geo/googleMaps";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/geo/googleMapsLoader";
import { VINH_LONG_MAP_CENTER } from "@/lib/geo/vinhLongBounds";
import "./google-map-route.css";

type MapMode = "loading" | "google" | "embed" | "fallback";

type GoogleMapRoutePanelProps = {
  origin?: GeoPoint | null;
  destination?: GeoPoint | null;
  originLabel?: string;
  destinationLabel?: string;
  fallbackEmbedUrl?: string;
  className?: string;
  mapHeight?: number;
};

function toLatLng(point: GeoPoint): google.maps.LatLngLiteral {
  return { lat: point.lat, lng: point.lng };
}

export default function GoogleMapRoutePanel({
  origin,
  destination,
  originLabel = "Điểm A",
  destinationLabel = "Điểm B",
  fallbackEmbedUrl,
  className,
  mapHeight = 220,
}: GoogleMapRoutePanelProps) {
  const { t } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mode, setMode] = useState<MapMode>("loading");
  const [loadError, setLoadError] = useState("");

  const apiKey = getGoogleMapsApiKey();
  const showRoute = Boolean(origin && destination);
  const mapCenter = destination ?? origin ?? {
    lat: VINH_LONG_MAP_CENTER.lat,
    lng: VINH_LONG_MAP_CENTER.lng,
  };

  const googleEmbedUrl = useMemo(
    () => (apiKey ? googleMapsEmbedUrl(apiKey, origin, destination) : null),
    [apiKey, origin, destination],
  );

  useEffect(() => {
    if (!apiKey) {
      setLoadError("Chưa cấu hình NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — đang dùng OpenStreetMap.");
      setMode("fallback");
      return;
    }

    let cancelled = false;
    setLoadError("");
    setMode("loading");

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!cancelled) setMode("google");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Không tải được Google Maps JavaScript API.";
        setLoadError(`${message} Đang thử Google Maps Embed.`);
        setMode(googleEmbedUrl ? "embed" : "fallback");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, googleEmbedUrl]);

  useEffect(() => {
    if (mode !== "google" || !containerRef.current || !window.google?.maps?.Map) return;

    function clearMarkers() {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    }

    function clearRenderer() {
      if (rendererRef.current) {
        rendererRef.current.setMap(null);
        rendererRef.current = null;
      }
    }

    function clearPolyline() {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    }

    function addMarker(point: GeoPoint, label: string, title: string) {
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: toLatLng(point),
        label,
        title,
      });
      markersRef.current.push(marker);
    }

    function drawStraightRoute(from: GeoPoint, to: GeoPoint) {
      clearPolyline();
      polylineRef.current = new google.maps.Polyline({
        map: mapRef.current,
        path: [toLatLng(from), toLatLng(to)],
        strokeColor: GOOGLE_ROUTE_STROKE_COLOR,
        strokeOpacity: 0.92,
        strokeWeight: 5,
      });
    }

    try {
      if (!mapRef.current) {
        containerRef.current.replaceChildren();
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: toLatLng(mapCenter),
          zoom: destination ? 14 : VINH_LONG_MAP_CENTER.zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
      }

      const map = mapRef.current;
      clearRenderer();
      clearPolyline();
      clearMarkers();

      if (origin && destination) {
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: false,
          polylineOptions: {
            strokeColor: GOOGLE_ROUTE_STROKE_COLOR,
            strokeOpacity: 0.92,
            strokeWeight: 5,
          },
        });
        rendererRef.current = directionsRenderer;

        directionsService.route(
          {
            origin: toLatLng(origin),
            destination: toLatLng(destination),
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
              addMarker(origin, "A", originLabel);
              addMarker(destination, "B", destinationLabel);
              return;
            }

            clearRenderer();
            addMarker(origin, "A", originLabel);
            addMarker(destination, "B", destinationLabel);
            drawStraightRoute(origin, destination);
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(toLatLng(origin));
            bounds.extend(toLatLng(destination));
            map.fitBounds(bounds, 56);

            if (status === google.maps.DirectionsStatus.REQUEST_DENIED) {
              setLoadError(
                "Directions API bị từ chối — hiển thị tuyến thẳng. Bật Directions API cho API key trong Google Cloud.",
              );
            }
          },
        );
      } else if (destination) {
        map.setCenter(toLatLng(destination));
        map.setZoom(15);
        addMarker(destination, "B", destinationLabel);
      } else {
        map.setCenter(toLatLng(mapCenter));
        map.setZoom(VINH_LONG_MAP_CENTER.zoom);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không khởi tạo được bản đồ Google.";
      setLoadError(`${message} Đang thử Google Maps Embed.`);
      setMode(googleEmbedUrl ? "embed" : "fallback");
    }

    return () => {
      clearRenderer();
      clearPolyline();
      clearMarkers();
    };
  }, [mode, origin, destination, originLabel, destinationLabel, mapCenter, googleEmbedUrl]);

  const rootClass = ["google-map-route", className].filter(Boolean).join(" ");

  if (mode === "embed" && googleEmbedUrl) {
    return (
      <div className={rootClass}>
        {loadError ? (
          <p className="google-map-route__error" role="status">
            {loadError}
          </p>
        ) : null}
        <iframe
          title="Bản đồ Google Maps"
          className="google-map-route__fallback google-map-route__fallback--google"
          src={googleEmbedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          style={{ height: mapHeight }}
        />
        {showRoute ? (
          <a
            href={googleMapsDirectionsUrl(origin!, destination!)}
            target="_blank"
            rel="noopener noreferrer"
            className="google-map-route__link"
          >
            Mở chỉ đường trên Google Maps
          </a>
        ) : null}
      </div>
    );
  }

  if (mode === "fallback" && fallbackEmbedUrl) {
    return (
      <div className={rootClass}>
        {loadError ? (
          <p className="google-map-route__error" role="status">
            {loadError}
          </p>
        ) : null}
        <iframe
          title="Bản đồ tham chiếu OpenStreetMap"
          className="google-map-route__fallback"
          src={fallbackEmbedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ height: mapHeight }}
        />
      </div>
    );
  }

  return (
    <div className={rootClass}>
      {loadError && mode === "google" ? (
        <p className="google-map-route__error" role="status">
          {loadError}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={`google-map-route__canvas${mode === "loading" ? " google-map-route__canvas--loading" : ""}`}
        style={{ height: mapHeight }}
        aria-busy={mode === "loading"}
      >
        {mode === "loading" ? "Đang tải Google Maps..." : null}
      </div>

      {showRoute && mode === "google" ? (
        <div className="google-map-route__legend">
          <span className="google-map-route__legend-item google-map-route__legend-item--a">
            A · {originLabel}
          </span>
          <span className="google-map-route__legend-item google-map-route__legend-item--b">
            B · {destinationLabel}
          </span>
          <span className="google-map-route__legend-route">Tuyến lái xe màu đỏ</span>
        </div>
      ) : null}

      {showRoute && mode === "google" ? (
        <a
          href={googleMapsDirectionsUrl(origin!, destination!)}
          target="_blank"
          rel="noopener noreferrer"
          className="google-map-route__link"
        >
          Mở chỉ đường trên Google Maps
        </a>
      ) : null}
    </div>
  );
}
