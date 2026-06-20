"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCar, FaCrosshairs, FaMapMarkerAlt, FaRoute } from "react-icons/fa";
import { getIdentityVerification } from "@/lib/api/identityVerification";
import type { JobListing } from "@/lib/api/jobs";
import {
  estimateDriveMinutes,
  formatDistanceKm,
  formatDurationMinutes,
  haversineKm,
} from "@/lib/geo/distance";
import { isOnsiteJob, jobSitePoint, parseGeoPoint, type GeoPoint } from "@/lib/geo/jobLocation";
import { searchAddressInVinhLong } from "@/lib/geo/nominatim";
import { osmDirectionsUrl, osmEmbedBboxUrl } from "@/lib/geo/osmMap";
import { fetchDrivingRoute } from "@/lib/geo/osrmRoute";

type WorkDetailCommutePanelProps = {
  job: JobListing;
  isFreelancerViewer: boolean;
};

type RouteStats = {
  distanceKm: number;
  durationMinutes: number;
  mode: "driving" | "straight";
};

export default function WorkDetailCommutePanel({
  job,
  isFreelancerViewer,
}: WorkDetailCommutePanelProps) {
  const { t } = useTranslation();

  const [jobPoint, setJobPoint] = useState<GeoPoint | null>(() => jobSitePoint(job));
  const [jobGeoLoading, setJobGeoLoading] = useState(false);
  const [freelancerPoint, setFreelancerPoint] = useState<GeoPoint | null>(null);
  const [freelancerSource, setFreelancerSource] = useState<"profile" | "gps" | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const siteLabel = job.location_label?.trim() || t("Địa điểm làm việc");

  useEffect(() => {
    const coords = jobSitePoint(job);
    if (coords) {
      setJobPoint(coords);
      return;
    }

    const label = job.location_label?.trim();
    if (!label || !isOnsiteJob(job)) return;

    let cancelled = false;
    setJobGeoLoading(true);
    searchAddressInVinhLong(label, 1)
      .then((results) => {
        if (cancelled) return;
        const first = results[0];
        if (!first) return;
        const point = parseGeoPoint(first.lat, first.lon);
        if (point) setJobPoint(point);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setJobGeoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [job]);

  useEffect(() => {
    if (!isFreelancerViewer) return;

    let cancelled = false;
    getIdentityVerification()
      .then((data) => {
        if (cancelled) return;
        const point = parseGeoPoint(
          data.verification?.address_lat,
          data.verification?.address_lng,
        );
        if (point) {
          setFreelancerPoint(point);
          setFreelancerSource("profile");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isFreelancerViewer]);

  const computeRoute = useCallback(async (from: GeoPoint, to: GeoPoint) => {
    setRouteLoading(true);
    try {
      const driving = await fetchDrivingRoute(from, to);
      if (driving) {
        setRouteStats({
          distanceKm: driving.distanceKm,
          durationMinutes: driving.durationMinutes,
          mode: "driving",
        });
        return;
      }
      const straightKm = haversineKm(from, to);
      setRouteStats({
        distanceKm: straightKm,
        durationMinutes: estimateDriveMinutes(straightKm * 1.25),
        mode: "straight",
      });
    } catch {
      const straightKm = haversineKm(from, to);
      setRouteStats({
        distanceKm: straightKm,
        durationMinutes: estimateDriveMinutes(straightKm * 1.25),
        mode: "straight",
      });
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!jobPoint || !freelancerPoint) {
      setRouteStats(null);
      return;
    }
    void computeRoute(freelancerPoint, jobPoint);
  }, [jobPoint, freelancerPoint, computeRoute]);

  const mapPoints = useMemo(() => {
    const points: GeoPoint[] = [];
    if (jobPoint) points.push(jobPoint);
    if (freelancerPoint) points.push(freelancerPoint);
    return points;
  }, [jobPoint, freelancerPoint]);

  const mapUrl = useMemo(() => osmEmbedBboxUrl(mapPoints), [mapPoints]);

  function useMyGps() {
  const t = tUi;
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ GPS.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = parseGeoPoint(pos.coords.latitude, pos.coords.longitude);
        if (!point) {
          setGpsError("Không đọc được tọa độ GPS.");
          setGpsLoading(false);
          return;
        }
        setFreelancerPoint(point);
        setFreelancerSource("gps");
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Bạn cần cho phép truy cập vị trí trong trình duyệt.");
          return;
        }
        setGpsError("Không lấy được vị trí GPS. Thử lại sau.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 },
    );
  }

  if (!isOnsiteJob(job)) return null;

  return (
    <section className="wd-card wd-commute" aria-labelledby="wd-commute-title">
      <h2 id="wd-commute-title" className="wd-card__title">
        <FaMapMarkerAlt aria-hidden className="wd-commute__title-icon" />
        Làm việc tại chỗ — khoảng cách di chuyển
      </h2>
      <p className="wd-commute__lead">
        Công việc yêu cầu đến địa điểm của khách hàng: <strong>{siteLabel}</strong>
      </p>

      {jobGeoLoading ? (
        <p className="wd-commute__hint">{t("Đang xác định vị trí công việc trên bản đồ...")}</p>
      ) : null}

      {!jobPoint && !jobGeoLoading ? (
        <p className="wd-commute__hint">
          Chưa có tọa độ chính xác cho địa điểm này. Bạn vẫn có thể xem địa chỉ ở trên.
        </p>
      ) : null}

      {jobPoint ? (
        <div className="wd-commute__map-wrap">
          <iframe
            title={t("Bản đồ địa điểm làm việc")}
            className="wd-commute__map"
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="wd-commute__legend" aria-hidden>
            <span className="wd-commute__legend-item wd-commute__legend-item--job">
              Địa điểm việc
            </span>
            {freelancerPoint ? (
              <span className="wd-commute__legend-item wd-commute__legend-item--me">
                Vị trí của bạn
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="wd-commute__actions">
        <button
          type="button"
          className="wd-commute__gps-btn"
          onClick={useMyGps}
          disabled={gpsLoading}
        >
          <FaCrosshairs aria-hidden />
          {gpsLoading ? "Đang lấy GPS..." : "Dùng vị trí hiện tại của tôi"}
        </button>
        {freelancerSource === "profile" && freelancerPoint ? (
          <p className="wd-commute__hint">
            Đang dùng địa chỉ từ hồ sơ xác minh. Bấm GPS để cập nhật theo vị trí thực tế.
          </p>
        ) : null}
        {isFreelancerViewer ? (
          <Link href="/edit-account/xac-minh" className="wd-commute__link">
            Cập nhật địa chỉ trong xác minh danh tính
          </Link>
        ) : null}
      </div>

      {gpsError ? (
        <p className="wd-commute__error" role="alert">
          {gpsError}
        </p>
      ) : null}

      {routeLoading ? (
        <p className="wd-commute__hint">{t("Đang tính quãng đường...")}</p>
      ) : null}

      {routeStats && freelancerPoint && jobPoint ? (
        <div className="wd-commute__stats">
          <div className="wd-commute__stat">
            <FaRoute className="wd-commute__stat-icon" aria-hidden />
            <span className="wd-commute__stat-label">{t("Khoảng cách")}</span>
            <strong className="wd-commute__stat-value">
              {formatDistanceKm(routeStats.distanceKm)}
            </strong>
            <span className="wd-commute__stat-note">
              {routeStats.mode === "driving" ? "Theo đường lái xe" : "Ước tính (đường chim)"}
            </span>
          </div>
          <div className="wd-commute__stat">
            <FaCar className="wd-commute__stat-icon" aria-hidden />
            <span className="wd-commute__stat-label">{t("Thời gian di chuyển")}</span>
            <strong className="wd-commute__stat-value">
              {formatDurationMinutes(routeStats.durationMinutes)}
            </strong>
            <span className="wd-commute__stat-note">{t("Ước tính ô tô / xe máy")}</span>
          </div>
        </div>
      ) : jobPoint && !freelancerPoint ? (
        <p className="wd-commute__hint">
          Bấm <strong>{t("Dùng vị trí hiện tại")}</strong> để xem khoảng cách và thời gian di chuyển từ
          bạn đến địa điểm làm việc.
        </p>
      ) : null}

      {freelancerPoint && jobPoint ? (
        <a
          href={osmDirectionsUrl(freelancerPoint, jobPoint)}
          target="_blank"
          rel="noopener noreferrer"
          className="wd-commute__directions"
        >
          Mở chỉ đường trên OpenStreetMap
        </a>
      ) : null}
    </section>
  );
}
