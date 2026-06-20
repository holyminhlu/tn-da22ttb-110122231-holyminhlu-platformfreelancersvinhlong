"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const t = tUi;
  const formatDate = formatDateUi;
  const formatVnd = formatVndUi;
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
            return (
              <li key={svc.id} className="svc-manage__card">
                <span className={badgeClass(status)}>{listingStatusLabel(status)}</span>
                <h2 className="svc-manage__card-title">
                  <Link href={`/dich-vu/quan-ly/${svc.id}`} className="svc-manage__card-title-link">
                    {t(svc.title)}
                  </Link>
                </h2>
                <p className="text-sm text-gray-600">{svc.category || "—"}</p>
                <p className="text-sm font-semibold text-gray-800">{formatVndUi(svc.price)}</p>
                {svc.admin_note ? (
                  <p className="text-xs text-red-700">Góp ý Admin: {svc.admin_note}</p>
                ) : null}
                <p className="text-xs text-gray-400">Cập nhật {formatDateUi(svc.updated_at || svc.created_at)}</p>
                <div className="svc-manage__card-actions">
                  <Link href={`/dich-vu/quan-ly/${svc.id}`} className="svc-btn svc-btn--primary">
                    {t("Xem chi tiết")}
                  </Link>
                  {status === "draft" || status === "denied" ? (
                    <button
                      type="button"
                      className="svc-btn svc-btn--primary"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "pending")}
                    >
                      {t("Gửi duyệt")}
                    </button>
                  ) : null}
                  {status === "pending" ? (
                    <button
                      type="button"
                      className="svc-btn svc-btn--primary"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "active")}
                    >
                      {t("Hiển thị (sau duyệt)")}
                    </button>
                  ) : null}
                  {status === "active" ? (
                    <button
                      type="button"
                      className="svc-btn svc-btn--secondary"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "paused")}
                    >
                      {t("Tạm dừng")}
                    </button>
                  ) : null}
                  {status === "paused" ? (
                    <button
                      type="button"
                      className="svc-btn svc-btn--primary"
                      disabled={busyId === svc.id}
                      onClick={() => void changeStatus(svc.id, "active")}
                    >
                      {t("Kích hoạt lại")}
                    </button>
                  ) : null}
                  <Link href={`/dich-vu/quan-ly/${svc.id}/chinh-sua`} className="svc-btn svc-btn--secondary">
                    {t("Chỉnh sửa")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ServicesShell>
  );
}
