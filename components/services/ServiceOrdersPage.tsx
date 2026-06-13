"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listServiceOrders, type ServiceOrderListItem } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import {
  ORDER_BUCKET_LABELS,
  classifyServiceOrder,
  countOrdersByBucket,
  filterOrdersByBucket,
  type ServiceOrderBucket,
} from "@/lib/services/servicesDisplay";
import {
  escrowStatusLabel,
  escrowStatusTone,
  orderBucketTone,
  orderCardStatusTone,
  orderCardTitle,
  orderCardToneClass,
  orderDeadlineTone,
  orderStatusBadgeClass,
  orderStatusChipClass,
  workflowStageLabel,
  workflowStageTone,
} from "@/lib/orders/serviceOrderDisplay";
import { orderDeadlineSubtitle } from "@/lib/orders/workflowSlaDisplay";
import { formatDate } from "@/lib/format";
import ServicesShell from "./ServicesShell";
import "../findwork/findwork-orders.css";

const BUCKETS: ServiceOrderBucket[] = [
  "all",
  "new",
  "in_progress",
  "awaiting_review",
  "completed",
  "cancelled",
];

export default function ServiceOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bucket, setBucket] = useState<ServiceOrderBucket>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listServiceOrders();
      if (data.role !== "freelancer") {
        setError("Trang này dành cho freelancer.");
        setOrders([]);
        return;
      }
      setOrders(
        (data.orders ?? []).filter((o) => o.service_id != null && o.service_id !== ""),
      );
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải đơn hàng.";
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => countOrdersByBucket(orders), [orders]);
  const filtered = useMemo(() => filterOrdersByBucket(orders, bucket), [orders, bucket]);

  return (
    <ServicesShell>
      <div className="fw-orders">
        <header className="fw-orders__head">
          <h1 className="fw-orders__title">Đơn hàng dịch vụ</h1>
          <p className="fw-orders__lead">
            Quản lý đơn Client đặt từ gig của bạn — tiếp nhận, thực hiện, giao bài và nghiệm thu.
          </p>
        </header>

        <div className="fw-orders__filters" role="tablist" aria-label="Lọc đơn hàng">
          {BUCKETS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={bucket === key}
              className={`fw-orders__filter${bucket === key ? " fw-orders__filter--active" : ""}`}
              onClick={() => setBucket(key)}
            >
              {ORDER_BUCKET_LABELS[key]} ({counts[key]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Đang tải...</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <div className="fw-orders__empty">
            {orders.length === 0
              ? "Chưa có đơn dịch vụ. Kích hoạt gig và chờ Client đặt mua."
              : "Không có đơn trong tab này."}
          </div>
        ) : (
          <ul className="fw-orders__list">
            {filtered.map((order) => {
              const bucketKey = classifyServiceOrder(order);
              const deadlineLine = orderDeadlineSubtitle(order);
              const urgent = bucketKey === "new" || bucketKey === "awaiting_review";
              const statusTone = orderCardStatusTone(order, true);
              const badgeTone = orderBucketTone(bucketKey);
              const stageTone = workflowStageTone(order.workflow_stage, order);
              const escrowTone = escrowStatusTone(order.escrow_status);
              const deadlineTone = orderDeadlineTone(deadlineLine);

              return (
                <li key={order.id}>
                  <Link
                    href={`/findwork/orders/${order.id}`}
                    className={`fw-orders__card ${orderCardToneClass(statusTone)}${urgent ? " fw-orders__card--urgent" : ""}`}
                  >
                    <div className="fw-orders__card-top">
                      <h2 className="fw-orders__card-title">
                        {orderCardTitle(order.service_title, order.job_title)}
                      </h2>
                      <span className={orderStatusBadgeClass(badgeTone)}>
                        {ORDER_BUCKET_LABELS[bucketKey]}
                      </span>
                    </div>
                    <p className="fw-orders__card-meta">
                      Client: <strong>{order.counterparty_name || "—"}</strong>
                      {order.agreed_price != null
                        ? ` · ${formatPackagePrice(Number(order.agreed_price))}`
                        : ""}
                    </p>
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
                        Cập nhật: {formatDate(order.updated_at || order.created_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ServicesShell>
  );
}
