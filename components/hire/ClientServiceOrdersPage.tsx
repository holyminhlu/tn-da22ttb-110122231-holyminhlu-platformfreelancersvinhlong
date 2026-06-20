"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listServiceOrders, type ServiceOrderListItem } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import {
  escrowStatusLabel,
  escrowStatusTone,
  filterServiceOrders,
  orderCardPreviewText,
  orderCardStatusTone,
  orderCardTitle,
  orderCardToneClass,
  orderDeadlineTone,
  orderStatusBadgeClass,
  orderStatusChipClass,
  orderStatusHint,
  parsePackageName,
  workflowStageLabel,
  workflowStageTone,
  type OrderListFilter,
} from "@/lib/orders/serviceOrderDisplay";
import { orderDeadlineSubtitle } from "@/lib/orders/workflowSlaDisplay";
import HireShell from "./HireShell";
import "./hire.css";
import "../findwork/findwork-orders.css";

const FILTERS: { value: OrderListFilter; label: string }[] = [
  { value: "all", label: tUi("Tất cả") },
  { value: "action", label: tUi("Cần xử lý") },
  { value: "active", label: tUi("Đang thực hiện") },
  { value: "done", label: tUi("Hoàn tất") },
];

export default function ClientServiceOrdersPage() {  const { t, formatDate } = useTranslation();

  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OrderListFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listServiceOrders();
      if (data.role !== "client") {
        setError(t("Trang này dành cho tài khoản client."));
        setOrders([]);
        return;
      }
      setOrders(data.orders ?? []);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải đơn dịch vụ.";
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => filterServiceOrders(orders, filter, false),
    [orders, filter],
  );

  const proposalPending = useMemo(
    () =>
      orders.filter(
        (o) =>
          String(o.workflow_stage).toLowerCase() === "selection" &&
          Boolean(o.proposal_text?.trim()),
      ).length,
    [orders],
  );

  return (
    <HireShell>
      <div className="hire-page hire-orders hire-orders--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">{t("Đơn dịch vụ")}</h1>
            <p className="hire-page__lead">
              Theo dõi yêu cầu báo giá, đề xuất từ freelancer, ký quỹ và nghiệm thu từng giai
              đoạn.
              {proposalPending > 0
                ? ` Bạn có ${proposalPending} đề xuất chờ xem xét.`
                : ""}
            </p>
          </div>
          <Link href="/hire/search" className="hire-page__post-btn">
            Tìm freelancer
          </Link>
        </header>

        {proposalPending > 0 ? (
          <p className="hire-page__banner hire-page__banner--success" role="status">
            Freelancer đã gửi đề xuất — mở đơn tương ứng để xem và chấp nhận.
          </p>
        ) : null}

        <div className="fw-orders__filters" role="tablist" aria-label={t("Lọc đơn")}>
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              className={`fw-orders__filter${filter === item.value ? " fw-orders__filter--active" : ""}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="hire-page__state">{t("Đang tải...")}</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <div className="fw-orders__empty">
            {filter === "all"
              ? "Chưa có đơn đặt dịch vụ. Gửi yêu cầu báo giá từ trang tìm freelancer."
              : "Không có đơn trong bộ lọc này."}
          </div>
        ) : (
          <ul className="fw-orders__list">
            {filtered.map((order) => {
              const pkgName = parsePackageName(order.package_snapshot);
              const hint = orderStatusHint(order, false);
              const deadlineLine = orderDeadlineSubtitle(order);
              const proposalPreview = orderCardPreviewText(order.proposal_text);
              const briefPreview = orderCardPreviewText(order.client_brief);
              const statusTone = orderCardStatusTone(order, false);
              const stageTone = workflowStageTone(order.workflow_stage, order);
              const escrowTone = escrowStatusTone(order.escrow_status);
              const deadlineTone = orderDeadlineTone(deadlineLine);
              const urgent =
                String(order.workflow_stage).toLowerCase() === "selection" && Boolean(proposalPreview);
              const badgeTone = urgent ? "warning" : statusTone;

              return (
                <li key={order.id}>
                  <Link
                    href={`/hire/orders/${order.id}`}
                    className={`fw-orders__card ${orderCardToneClass(statusTone)}${urgent ? " fw-orders__card--urgent" : ""}`}
                  >
                    <div className="fw-orders__card-top">
                      <h2 className="fw-orders__card-title">
                        {orderCardTitle(order.service_title, order.job_title)}
                      </h2>
                      <span className={orderStatusBadgeClass(badgeTone)}>
                        {urgent ? "Có đề xuất mới" : hint}
                      </span>
                    </div>
                    <p className="fw-orders__card-meta">
                      Freelancer: <strong>{order.counterparty_name || "—"}</strong>
                      {pkgName ? ` · Gói ${pkgName}` : ""}
                      {order.agreed_price != null
                        ? ` · ${formatPackagePrice(Number(order.agreed_price))}`
                        : ""}
                    </p>
                    {proposalPreview ? (
                      <p className="fw-orders__card-preview fw-orders__card-preview--proposal">
                        <span className="fw-orders__card-preview-label">{t("Đề xuất:")}</span>{" "}
                        {proposalPreview}
                      </p>
                    ) : briefPreview ? (
                      <p className="fw-orders__card-preview">{briefPreview}</p>
                    ) : null}
                    <div className="fw-orders__card-foot">
                      <span className={orderStatusChipClass(stageTone)}>
                        {workflowStageLabel(order.workflow_stage)}
                      </span>
                      <span className={orderStatusChipClass(escrowTone)}>
                        Ký quỹ: {escrowStatusLabel(order.escrow_status)}
                      </span>
                      {deadlineLine ? (
                        <span className={orderStatusChipClass(deadlineTone)}>{deadlineLine}</span>
                      ) : null}
                      <span className="fw-orders__card-foot-date">
                        Cập nhật: {formatDateUi(order.updated_at || order.created_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </HireShell>
  );
}
