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
import UserAvatar from "@/components/ui/UserAvatar";
import FreelancerWorkShell from "./FreelancerWorkShell";
import "./findwork-orders.css";

const FILTERS: { value: OrderListFilter; label: string }[] = [
  { value: "all", label: tUi("Tất cả") },
  { value: "action", label: tUi("Cần xử lý") },
  { value: "active", label: tUi("Đang làm") },
  { value: "done", label: tUi("Hoàn tất") },
];

export default function FreelancerServiceOrdersPage() {  const { t, formatDate } = useTranslation();

  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OrderListFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listServiceOrders();
      if (data.role !== "freelancer") {
        setError(t("Trang này dành cho tài khoản freelancer."));
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
    () => filterServiceOrders(orders, filter, true),
    [orders, filter],
  );

  const actionCount = useMemo(
    () => filterServiceOrders(orders, "action", true).length,
    [orders],
  );

  return (
    <FreelancerWorkShell>
      <div className="fw-orders">
        <header className="fw-orders__head">
          <h1 className="fw-orders__title">{t("Việc & đơn đã nhận")}</h1>
          <p className="fw-orders__lead">
            Gồm đơn dịch vụ (gigs) và công việc client chốt tuyển từ báo giá — cập nhật tiến độ,
            bàn giao và nghiệm thu theo từng giai đoạn.
            {actionCount > 0 ? ` Bạn có ${actionCount} mục cần xử lý.` : ""}
          </p>
        </header>

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
          <p className="text-sm text-gray-500">{t("Đang tải...")}</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <div className="fw-orders__empty">
            {filter === "all"
              ? "Chưa có việc hoặc đơn nào. Hãy nộp báo giá tại Tìm việc làm hoặc chờ client đặt gói dịch vụ của bạn."
              : "Không có mục nào trong bộ lọc này."}
          </div>
        ) : (
          <ul className="fw-orders__list">
            {filtered.map((order) => {
              const pkgName = parsePackageName(order.package_snapshot);
              const hint = orderStatusHint(order, true);
              const deadlineLine = orderDeadlineSubtitle(order);
              const urgent =
                (order.workflow_stage === "selection" && !order.proposal_text) ||
                (order.workflow_stage === "execution" && !order.delivered_at);

              const briefPreview = orderCardPreviewText(order.client_brief);
              const statusTone = orderCardStatusTone(order, true);
              const stageTone = workflowStageTone(order.workflow_stage, order);
              const escrowTone = escrowStatusTone(order.escrow_status);
              const deadlineTone = orderDeadlineTone(deadlineLine);
              const badgeTone = urgent ? "warning" : statusTone;

              return (
                <li key={order.id}>
                  <Link
                    href={`/findwork/orders/${order.id}`}
                    className={`fw-orders__card ${orderCardToneClass(statusTone)}${urgent ? " fw-orders__card--urgent" : ""}`}
                  >
                    <div className="fw-orders__card-top">
                      <UserAvatar
                        src={order.counterparty_avatar_url}
                        name={order.counterparty_name}
                        size={40}
                        className="fw-orders__card-avatar"
                      />
                      <div className="fw-orders__card-top-main">
                      <h2 className="fw-orders__card-title">
                        {orderCardTitle(order.service_title, order.job_title, "Hợp đồng")}
                      </h2>
                      <span className={orderStatusBadgeClass(badgeTone)}>{hint}</span>
                      </div>
                    </div>
                    <p className="fw-orders__card-meta">
                      Khách hàng: <strong>{order.counterparty_name || "—"}</strong>
                      {pkgName ? ` · Gói ${pkgName}` : ""}
                      {order.agreed_price != null
                        ? ` · ${formatPackagePrice(Number(order.agreed_price))}`
                        : ""}
                    </p>
                    {briefPreview ? (
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
    </FreelancerWorkShell>
  );
}
