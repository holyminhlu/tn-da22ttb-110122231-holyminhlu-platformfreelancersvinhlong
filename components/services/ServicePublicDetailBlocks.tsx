"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { useMemo, useState } from "react";
import { FaVideo } from "react-icons/fa";
import type { FreelancerServiceItem } from "@/lib/api/freelancers";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { resolveFreelancerMedia } from "@/lib/hire/freelancerSearchDisplay";
import {
  isSinglePackagePricing,
  parseDemoMedia,
  parseRequirementsLines,
  parseRequirementsNotes,
  parseServiceFaqs,
  parseServiceGallery,
  parseServiceTags,
  servicePackagesForPublic,
} from "@/lib/services/serviceDetailDisplay";
import ServiceDemoModal from "./ServiceDemoModal";
import ServiceGalleryLightbox from "./ServiceGalleryLightbox";
import "./services-hub.css";

type ServicePublicDetailBlocksProps = {
  service: FreelancerServiceItem;
};

export default function ServicePublicDetailBlocks({ service }: ServicePublicDetailBlocksProps) {
  const { t } = useTranslation();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [demoOpen, setDemoOpen] = useState(false);

  const gallerySources = useMemo(
    () =>
      parseServiceGallery(service.media_urls)
        .map((url) => resolveFreelancerMedia(url))
        .filter((src): src is string => Boolean(src)),
    [service.media_urls],
  );
  const demo = useMemo(() => parseDemoMedia(service.demo_media), [service.demo_media]);
  const demoMediaUrl = demo?.url ? resolveFreelancerMedia(demo.url) || demo.url : null;
  const packages = useMemo(() => servicePackagesForPublic(service), [service]);
  const singlePrice = isSinglePackagePricing(packages);
  const faqs = useMemo(() => parseServiceFaqs(service.faqs), [service.faqs]);
  const tags = useMemo(() => parseServiceTags(service.tech_stack), [service.tech_stack]);
  const reqLines = useMemo(() => parseRequirementsLines(service.requirements), [service.requirements]);
  const reqNotes = useMemo(() => parseRequirementsNotes(service.requirements), [service.requirements]);

  const hasBlocks =
    gallerySources.length > 0 ||
    Boolean(demoMediaUrl) ||
    packages.length > 0 ||
    faqs.length > 0 ||
    reqLines.length > 0 ||
    Boolean(service.requirements?.trim()) ||
    tags.length > 0 ||
    Boolean(service.support_upsell?.trim());

  if (!hasBlocks) return null;

  return (
    <div className="hire-fl-detail__svc-blocks">
      {gallerySources.length > 0 ? (
        <div className="hire-fl-detail__svc-block">
          <h4 className="hire-fl-detail__svc-block-title">{t("Thư viện ảnh")}</h4>
          <ul className="svc-detail__gallery hire-fl-detail__svc-gallery">
            {gallerySources.map((src, idx) => (
              <li key={`${src}-${idx}`}>
                <button
                  type="button"
                  className="svc-detail__gallery-btn"
                  onClick={() => {
                    setGalleryIndex(idx);
                    setGalleryOpen(true);
                  }}
                  aria-label={`${t("Xem ảnh")} ${idx + 1}`}
                >
                  <Image src={src} alt="" width={160} height={120} unoptimized />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {demoMediaUrl ? (
        <div className="hire-fl-detail__svc-block">
          <button type="button" className="hire-fl-detail__svc-demo-btn" onClick={() => setDemoOpen(true)}>
            <FaVideo aria-hidden />
            {t("Xem video / file demo")}
          </button>
        </div>
      ) : null}

      {packages.length > 0 ? (
        <div className="hire-fl-detail__svc-block">
          <h4 className="hire-fl-detail__svc-block-title">
            {singlePrice ? t("Giá trọn gói") : t("Các gói dịch vụ")}
          </h4>
          <div className="hire-fl-detail__svc-table-wrap">
            <table className="hire-fl-detail__svc-table">
              <thead>
                <tr>
                  <th>{t("Gói")}</th>
                  <th>{t("Giá")}</th>
                  <th>{t("Thời gian")}</th>
                  <th>{t("Chỉnh sửa")}</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{t(pkg.name)}</td>
                    <td>{formatPackagePrice(pkg.price)}</td>
                    <td>{pkg.deliveryDays} {t("ngày")}</td>
                    <td>{pkg.revisions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="hire-fl-detail__svc-block">
          <h4 className="hire-fl-detail__svc-block-title">Tags</h4>
          <div className="hire-fl-detail__chips">
            {tags.map((tag) => (
              <span key={tag} className="hire-fl-detail__chip hire-fl-detail__chip--muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {reqLines.length > 0 || service.requirements?.trim() ? (
        <div className="hire-fl-detail__svc-block">
          <h4 className="hire-fl-detail__svc-block-title">{t("Yêu cầu từ Khách hàng")}</h4>
          {reqLines.length > 0 ? (
            <ol className="hire-fl-detail__svc-req-list">
              {reqLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          ) : (
            <p className="hire-fl-detail__svc-prose">{service.requirements?.trim()}</p>
          )}
          {reqNotes ? (
            <p className="hire-fl-detail__svc-note">
              <strong>{t("Ghi chú thêm:")}</strong> {reqNotes}
            </p>
          ) : null}
        </div>
      ) : null}

      {faqs.length > 0 ? (
        <div className="hire-fl-detail__svc-block">
          <h4 className="hire-fl-detail__svc-block-title">FAQ</h4>
          <dl className="hire-fl-detail__svc-faq">
            {faqs.map((faq, idx) => (
              <div key={`${faq.q}-${idx}`} className="hire-fl-detail__svc-faq-item">
                <dt>{faq.q}</dt>
                <dd>{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {service.support_upsell?.trim() ? (
        <div className="hire-fl-detail__svc-block">
          <h4 className="hire-fl-detail__svc-block-title">{t("Dịch vụ bổ sung")}</h4>
          <p className="hire-fl-detail__svc-prose">{service.support_upsell.trim()}</p>
        </div>
      ) : null}

      <ServiceGalleryLightbox
        open={galleryOpen}
        images={gallerySources}
        index={galleryIndex}
        onIndexChange={setGalleryIndex}
        onClose={() => setGalleryOpen(false)}
      />

      {demo?.url ? (
        <ServiceDemoModal
          open={demoOpen}
          onClose={() => setDemoOpen(false)}
          url={demo.url}
          kind={demo.kind}
        />
      ) : null}
    </div>
  );
}
