"use client";

import { useTranslation } from "@/hooks/useTranslation";
import "./admin.css";

export default function AdminServicesPage() {
  const { t } = useTranslation();

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">{t("Quản lý Dịch vụ")}</h1>
        <p className="admin-page__subtitle">{t("Trang đang được phát triển.")}</p>
      </header>
    </div>
  );
}
