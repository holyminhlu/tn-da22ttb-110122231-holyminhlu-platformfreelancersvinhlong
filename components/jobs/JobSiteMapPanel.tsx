"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useMemo, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import type { JobListing } from "@/lib/api/jobs";
import {
  isOnsiteJob,
  isRemoteJobLocation,
  jobSitePoint,
  parseGeoPoint,
} from "@/lib/geo/jobLocation";
import { searchAddressInVinhLong } from "@/lib/geo/nominatim";
import { osmEmbedBboxUrl } from "@/lib/geo/osmMap";
import { REMOTE_WORK_LOCATION_LABEL } from "@/lib/hire/workLocation";

type JobSiteMapPanelProps = {
  job: JobListing;
  className?: string;
};

export default function JobSiteMapPanel({
  job, className }: JobSiteMapPanelProps) {
  const { t } = useTranslation();

  const [jobPoint, setJobPoint] = useState(() => jobSitePoint(job));
  const [jobGeoLoading, setJobGeoLoading] = useState(false);

  const siteLabel = job.location_label?.trim() || t("Địa điểm làm việc");
  const isRemote = isRemoteJobLocation(job.location_label);

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

  const mapUrl = useMemo(
    () => (jobPoint ? osmEmbedBboxUrl([jobPoint]) : ""),
    [jobPoint],
  );

  const osmViewUrl = jobPoint
    ? `https://www.openstreetmap.org/?mlat=${jobPoint.lat}&mlon=${jobPoint.lng}#map=16/${jobPoint.lat}/${jobPoint.lng}`
    : null;

  const sectionClass = ["hire-manage__job-section", className].filter(Boolean).join(" ");

  if (isRemote) {
    return (
      <section className={sectionClass}>
        <h3 className="hire-manage__job-section-title">
          <FaMapMarkerAlt aria-hidden />
          {t("Hình thức làm việc")}
        </h3>
        <p className="hire-manage__job-remote">{REMOTE_WORK_LOCATION_LABEL}</p>
      </section>
    );
  }

  if (!isOnsiteJob(job)) return null;

  return (
    <section className={sectionClass}>
      <h3 className="hire-manage__job-section-title">
        <FaMapMarkerAlt aria-hidden />
        {t("Vị trí trên bản đồ")}
      </h3>
      <p className="hire-manage__job-location-label">{siteLabel}</p>
      {jobGeoLoading ? (
        <p className="hire-manage__job-map-hint">{t("Đang xác định vị trí trên bản đồ...")}</p>
      ) : null}
      {!jobPoint && !jobGeoLoading ? (
        <p className="hire-manage__job-map-hint">
          {t("Chưa có tọa độ chính xác. Địa chỉ đã khai báo:")} <strong>{siteLabel}</strong>
        </p>
      ) : null}
      {jobPoint ? (
        <>
          <div className="hire-manage__job-map-wrap">
            <iframe
              title={`Bản đồ: ${siteLabel}`}
              className="hire-manage__job-map"
              src={mapUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          {osmViewUrl ? (
            <a
              href={osmViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hire-manage__job-map-link"
            >
              {t("Mở vị trí trên OpenStreetMap")}
            </a>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
