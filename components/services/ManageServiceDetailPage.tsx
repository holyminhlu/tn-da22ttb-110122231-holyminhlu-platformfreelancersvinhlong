"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaClock,
  FaExternalLinkAlt,
  FaImage,
  FaStar,
  FaVideo,
} from "react-icons/fa";
import {
  getMyService,
  patchMyServiceStatus,
  type MyServiceRow,
  type ServiceListingStatus,
} from "@/lib/api/services";
import { getMe } from "@/lib/api/users";
import { resolveFreelancerMedia } from "@/lib/hire/freelancerSearchDisplay";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { listingStatusLabel } from "@/lib/services/servicesDisplay";
import {
  isSinglePackagePricing,
  packagePriceLabel,
  parseDemoMedia,
  parseRequirementsLines,
  parseRequirementsNotes,
  parseServiceFaqs,
  parseServiceGallery,
  parseServiceTags,
  servicePackagesForRow,
} from "@/lib/services/serviceDetailDisplay";
import ServicesShell from "./ServicesShell";

function badgeClass(status: string): string {
  return `svc-manage__badge svc-manage__badge--${status.toLowerCase()}`;
}

export default function ManageServiceDetailPage() {  const { t, formatDate } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const serviceId = typeof params.serviceId === "string" ? params.serviceId : "";

  const [service, setService] = useState<MyServiceRow | null>(null);
  const [freelancerId, setFreelancerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!serviceId) {
      setError(t("Thiếu mã dịch vụ."));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [row, me] = await Promise.all([getMyService(serviceId), getMe()]);
      setService(row);
      setFreelancerId(me.user?.id || "");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết dịch vụ.";
      setError(message);
      setService(null);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const packages = useMemo(
    () => (service ? servicePackagesForRow(service) : []),
    [service],
  );
  const tags = useMemo(() => (service ? parseServiceTags(service.tech_stack) : []), [service]);
  const faqs = useMemo(() => (service ? parseServiceFaqs(service.faqs) : []), [service]);
  const gallery = useMemo(() => (service ? parseServiceGallery(service.media_urls) : []), [service]);
  const reqLines = useMemo(
    () => (service ? parseRequirementsLines(service.requirements) : []),
    [service],
  );
  const reqNotes = useMemo(
    () => (service ? parseRequirementsNotes(service.requirements) : null),
    [service],
  );
  const demo = useMemo(() => (service ? parseDemoMedia(service.demo_media) : null), [service]);
  const coverSrc = resolveFreelancerMedia(service?.thumbnail_url);
  const singlePrice = isSinglePackagePricing(packages);

  async function changeStatus(status: ServiceListingStatus) {
    if (!service) return;
    setBusy(true);
    try {
      const result = await patchMyServiceStatus(service.id, status);
      alert(result.message);
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật.";
      alert(message);
    } finally {
      setBusy(false);
    }
  }

  const status = String(service?.listing_status || "draft").toLowerCase();
  const clientPreviewHref =
    service && status === "active" && freelancerId
      ? `/hire/quote?serviceId=${encodeURIComponent(service.id)}&freelancerId=${encodeURIComponent(freelancerId)}`
      : null;

  return (
    <ServicesShell>
      <div className="svc-detail">
        <Link href="/dich-vu/quan-ly" className="svc-detail__back">
          <FaArrowLeft aria-hidden /> {t("Quay lại quản lý")}
        </Link>

        {loading ? (
          <p className="text-sm text-gray-500">{t("Đang tải chi tiết...")}</p>
        ) : error ? (
          <div className="svc-panel">
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
            <button type="button" className="svc-btn svc-btn--secondary mt-3" onClick={() => router.push("/dich-vu/quan-ly")}>
              {t("Về danh sách")}
            </button>
          </div>
        ) : service ? (
          <>
            <header className="svc-detail__head">
              <div className="svc-detail__head-main">
                <span className={badgeClass(status)}>{listingStatusLabel(status)}</span>
                <h1 className="svc-detail__title">{t(service.title)}</h1>
                {service.category ? (
                  <p className="svc-detail__meta-line">{service.category}</p>
                ) : null}
                {service.admin_note ? (
                  <p className="svc-detail__admin-note" role="alert">
                    <strong>{t("Góp ý Admin:")}</strong> {service.admin_note}
                  </p>
                ) : null}
              </div>
              <div className="svc-detail__head-actions">
                {status === "draft" || status === "denied" ? (
                  <button
                    type="button"
                    className="svc-btn svc-btn--primary"
                    disabled={busy}
                    onClick={() => void changeStatus("pending")}
                  >
                    {t("Gửi duyệt")}
                  </button>
                ) : null}
                {status === "pending" ? (
                  <button
                    type="button"
                    className="svc-btn svc-btn--primary"
                    disabled={busy}
                    onClick={() => void changeStatus("active")}
                  >
                    {t("Hiển thị (sau duyệt)")}
                  </button>
                ) : null}
                {status === "active" ? (
                  <button
                    type="button"
                    className="svc-btn svc-btn--secondary"
                    disabled={busy}
                    onClick={() => void changeStatus("paused")}
                  >
                    {t("Tạm dừng")}
                  </button>
                ) : null}
                {status === "paused" ? (
                  <button
                    type="button"
                    className="svc-btn svc-btn--primary"
                    disabled={busy}
                    onClick={() => void changeStatus("active")}
                  >
                    {t("Kích hoạt lại")}
                  </button>
                ) : null}
                {clientPreviewHref ? (
                  <Link href={clientPreviewHref} className="svc-btn svc-btn--secondary" target="_blank">
                    <FaExternalLinkAlt aria-hidden /> {t("Xem như Khách hàng")}
                  </Link>
                ) : null}
                <Link href={`/dich-vu/quan-ly/${service.id}/chinh-sua`} className="svc-btn svc-btn--primary">
                  {t("Chỉnh sửa")}
                </Link>
              </div>
            </header>

            <div className="svc-detail__layout">
              <aside className="svc-detail__aside">
                <div className="svc-detail__cover">
                  {coverSrc ? (
                    <Image
                      src={coverSrc}
                      alt=""
                      width={400}
                      height={225}
                      className="svc-detail__cover-img"
                      unoptimized
                    />
                  ) : (
                    <div className="svc-detail__cover-placeholder">
                      <FaImage aria-hidden />
                      <span>{t("Chưa có ảnh cover")}</span>
                    </div>
                  )}
                </div>

                <dl className="svc-detail__stats">
                  <div>
                    <dt>{t("Giá")}</dt>
                    <dd>{packagePriceLabel(packages)}</dd>
                  </div>
                  <div>
                    <dt>{t("Hình thức")}</dt>
                    <dd>{singlePrice ? "Một giá trọn gói" : `${packages.length} gói`}</dd>
                  </div>
                  {service.delivery_days != null ? (
                    <div>
                      <dt>{t("Bàn giao")}</dt>
                      <dd>
                        <FaClock aria-hidden /> {service.delivery_days} ngày
                      </dd>
                    </div>
                  ) : null}
                  {service.response_time_hours != null ? (
                    <div>
                      <dt>{t("Phản hồi")}</dt>
                      <dd>Trong {service.response_time_hours} giờ</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{t("Đánh giá")}</dt>
                    <dd>
                      <FaStar aria-hidden className="svc-detail__star" />
                      {service.rating_avg != null && service.rating_avg > 0
                        ? `${Number(service.rating_avg).toFixed(1)} (${service.total_reviews})`
                        : "Chưa có đánh giá"}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Tạo lúc")}</dt>
                    <dd>{formatDateUi(service.created_at)}</dd>
                  </div>
                  <div>
                    <dt>{t("Cập nhật")}</dt>
                    <dd>{formatDateUi(service.updated_at || service.created_at)}</dd>
                  </div>
                  {service.published_at ? (
                    <div>
                      <dt>{t("Công khai")}</dt>
                      <dd>{formatDateUi(service.published_at)}</dd>
                    </div>
                  ) : null}
                </dl>

                {tags.length > 0 ? (
                  <div className="svc-detail__tags">
                    <p className="svc-detail__section-label">Tags</p>
                    <div className="post-job-wizard__tag-preview">
                      {tags.map((t) => (
                        <span key={t} className="post-job-wizard__tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>

              <div className="svc-detail__main">
                {service.description?.trim() ? (
                  <section className="svc-detail__section">
                    <h2 className="svc-detail__section-title">{t("Mô tả dịch vụ")}</h2>
                    <div className="svc-detail__prose">{service.description.trim()}</div>
                  </section>
                ) : (
                  <section className="svc-detail__section svc-detail__empty-block">
                    {t("Chưa có mô tả chi tiết.")}
                  </section>
                )}

                <section className="svc-detail__section">
                  <h2 className="svc-detail__section-title">
                    {singlePrice ? "Giá trọn gói" : "Các gói dịch vụ"}
                  </h2>
                  <div className="svc-detail__table-wrap">
                    <table className="svc-detail__table">
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
                            <td>{pkg.deliveryDays} ngày</td>
                            <td>{pkg.revisions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {packages.some((p) => p.features?.length) ? (
                    <ul className="svc-detail__features">
                      {packages.map((pkg) =>
                        pkg.features?.length ? (
                          <li key={pkg.id}>
                            <strong>{t(pkg.name)}:</strong> {pkg.features.join(" · ")}
                          </li>
                        ) : null,
                      )}
                    </ul>
                  ) : null}
                </section>

                <section className="svc-detail__section">
                  <h2 className="svc-detail__section-title">{t("Yêu cầu từ Khách hàng")}</h2>
                  <p className="svc-detail__hint">
                    {t("Khách hàng sẽ thấy danh sách này sau khi thanh toán và bạn tiếp nhận đơn.")}
                  </p>
                  {reqLines.length > 0 ? (
                    <ol className="svc-detail__req-list">
                      {reqLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ol>
                  ) : service.requirements?.trim() ? (
                    <div className="svc-detail__prose">{service.requirements.trim()}</div>
                  ) : (
                    <p className="svc-detail__empty-inline">{t("Chưa khai báo yêu cầu.")}</p>
                  )}
                  {reqNotes ? (
                    <div className="svc-detail__req-notes">
                      <strong>{t("Ghi chú thêm:")}</strong> {reqNotes}
                    </div>
                  ) : null}
                </section>

                <section className="svc-detail__section">
                  <h2 className="svc-detail__section-title">FAQ</h2>
                  {faqs.length > 0 ? (
                    <dl className="svc-detail__faq">
                      {faqs.map((faq, idx) => (
                        <div key={`${faq.q}-${idx}`} className="svc-detail__faq-item">
                          <dt>{faq.q}</dt>
                          <dd>{faq.a}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="svc-detail__empty-inline">{t("Chưa có câu hỏi thường gặp.")}</p>
                  )}
                </section>

                <section className="svc-detail__section">
                  <h2 className="svc-detail__section-title">Gallery & Demo</h2>
                  {gallery.length > 0 ? (
                    <ul className="svc-detail__gallery">
                      {gallery.map((url) => {
                        const src = resolveFreelancerMedia(url);
                        if (!src) return null;
                        return (
                          <li key={url}>
                            <Image src={src} alt="" width={160} height={120} unoptimized />
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="svc-detail__empty-inline">{t("Chưa có ảnh gallery.")}</p>
                  )}
                  {demo?.url ? (
                    <p className="svc-detail__demo">
                      <FaVideo aria-hidden />
                      <a href={resolveFreelancerMedia(demo.url) || demo.url} target="_blank" rel="noreferrer">
                        {t("Mở video / file demo")}
                      </a>
                    </p>
                  ) : null}
                </section>

                {service.support_upsell?.trim() ? (
                  <section className="svc-detail__section">
                    <h2 className="svc-detail__section-title">{t("Dịch vụ bổ sung")}</h2>
                    <div className="svc-detail__prose">{service.support_upsell.trim()}</div>
                  </section>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ServicesShell>
  );
}
