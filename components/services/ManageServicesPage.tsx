"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaImage } from "react-icons/fa";
import {
  listMyServices,
  patchMyServiceStatus,
  type MyServiceRow,
  type ServiceListingStatus,
} from "@/lib/api/services";
import {
  countServicesByStatus,
  listingStatusLabel,
} from "@/lib/services/servicesDisplay";
import { resolveFreelancerMedia } from "@/lib/hire/freelancerSearchDisplay";
import ServicesShell from "./ServicesShell";

const TABS: { value: ServiceListingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "draft", label: "Nháp" },
  { value: "paused", label: "Tạm dừng" },
  { value: "denied", label: "Cần chỉnh sửa" },
];

function badgeClass(status: string): string {
  const s = status.toLowerCase();
  return `svc-manage__badge svc-manage__badge--${s}`;
}

export default function ManageServicesPage() {  const { t, formatVnd, formatDate } = useTranslation();
  const [services, setServices] = useState<MyServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ServiceListingStatus | "all">("all");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setServices(await listMyServices());
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải dịch vụ.";
      setError(message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c = countServicesByStatus(services);
    return { all: services.length, ...c };
  }, [services]);

  const visible = useMemo(() => {
    if (tab === "all") return services;
    return services.filter((s) => String(s.listing_status).toLowerCase() === tab);
  }, [services, tab]);

  async function changeStatus(serviceId: string, status: ServiceListingStatus) {
    setBusyId(serviceId);
    try {
      const result = await patchMyServiceStatus(serviceId, status);
      alert(result.message);
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật.";
      alert(message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <ServicesShell>
      <header className="svc-hub__head">
        <div>
          <h1 className="svc-hub__title">{t("Quản lý dịch vụ")}</h1>
          <p className="svc-hub__lead">
            {t("Theo dõi trạng thái hiển thị — nháp, chờ duyệt, đang hoạt động, tạm dừng hoặc cần chỉnh sửa.")}
          </p>
        </div>
        <Link href="/dich-vu/tao-moi" className="svc-hub__cta">
          {t("+ Đăng dịch vụ mới")}
        </Link>
      </header>

      <div className="svc-manage__tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            className={`svc-manage__tab${tab === item.value ? " svc-manage__tab--active" : ""}`}
            onClick={() => setTab(item.value)}
          >
            {t(item.label)} ({counts[item.value] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{t("Đang tải...")}</p>
      ) : error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : visible.length === 0 ? (
        <div className="svc-panel text-center text-gray-600 text-sm">
          {services.length === 0
            ? "Chưa có dịch vụ nào. Bắt đầu với Đăng dịch vụ mới."
            : "Không có dịch vụ trong tab này."}
        </div>
      ) : (
        <ul className="svc-manage__list">
          {visible.map((svc) => {
            const status = String(svc.listing_status).toLowerCase();
            const thumbSrc = resolveFreelancerMedia(svc.thumbnail_url);
            return (
              <li key={svc.id} className="svc-manage__card">
                <div className="svc-manage__card-media">
                  {thumbSrc ? (
                    <Image src={thumbSrc} alt="" width={360} height={200} className="svc-manage__card-img" unoptimized />
                  ) : (
                    <div className="svc-manage__card-media-placeholder">
                      <FaImage aria-hidden />
                      <span>{t("Chưa có ảnh bìa")}</span>
                    </div>
                  )}
                  <span className={`${badgeClass(status)} svc-manage__card-badge`}>{listingStatusLabel(status)}</span>
                </div>

                <div className="svc-manage__card-body">
                  <h2 className="svc-manage__card-title">
                    <Link href={`/dich-vu/quan-ly/${svc.id}`} className="svc-manage__card-title-link">
                      {t(svc.title)}
                    </Link>
                  </h2>
                  <div className="svc-manage__card-meta">
                    <span className="svc-manage__card-category">{svc.category || "—"}</span>
                    <span className="svc-manage__card-price">{formatVndUi(svc.price)}</span>
                  </div>
                  {svc.admin_note ? (
                    <p className="svc-manage__card-note">{t("Góp ý Admin:")} {svc.admin_note}</p>
                  ) : null}
                  <p className="svc-manage__card-date">
                    {t("Cập nhật")} {formatDateUi(svc.updated_at || svc.created_at)}
                  </p>
                </div>

                <div className="svc-manage__card-actions">
                  <Link href={`/dich-vu/quan-ly/${svc.id}`} className="svc-manage__card-btn svc-manage__card-btn--primary">
                    {t("Chi tiết")}
                  </Link>
                  <Link href={`/dich-vu/quan-ly/${svc.id}/chinh-sua`} className="svc-manage__card-btn svc-manage__card-btn--secondary">
                    {t("Chỉnh sửa")}
                  </Link>
                  {status === "draft" || status === "denied" ? (
                    <button
                      type="button"
                      className="svc-manage__card-btn svc-manage__card-btn--accent"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "pending")}
                    >
                      {t("Gửi duyệt")}
                    </button>
                  ) : null}
                  {status === "pending" ? (
                    <button
                      type="button"
                      className="svc-manage__card-btn svc-manage__card-btn--accent"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "active")}
                    >
                      {t("Hiển thị")}
                    </button>
                  ) : null}
                  {status === "active" ? (
                    <button
                      type="button"
                      className="svc-manage__card-btn svc-manage__card-btn--muted"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "paused")}
                    >
                      {t("Tạm dừng")}
                    </button>
                  ) : null}
                  {status === "paused" ? (
                    <button
                      type="button"
                      className="svc-manage__card-btn svc-manage__card-btn--accent"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "active")}
                    >
                      {t("Kích hoạt")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ServicesShell>
  );
}
