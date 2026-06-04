import type { MyServiceRow, ServiceListingStatus } from "@/lib/api/services";
import type { ServiceOrderListItem } from "@/lib/api/contracts";
import { isOrderExpiredOrCancelled } from "@/lib/orders/workflowSlaDisplay";

export const LISTING_STATUS_LABELS: Record<ServiceListingStatus, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  active: "Đang hoạt động",
  paused: "Tạm dừng",
  denied: "Cần chỉnh sửa",
};

export function listingStatusLabel(status: string): string {
  const s = String(status).toLowerCase() as ServiceListingStatus;
  return LISTING_STATUS_LABELS[s] || status;
}

export function countServicesByStatus(services: MyServiceRow[]): Record<ServiceListingStatus, number> {
  const counts: Record<ServiceListingStatus, number> = {
    draft: 0,
    pending: 0,
    active: 0,
    paused: 0,
    denied: 0,
  };
  for (const s of services) {
    const key = String(s.listing_status || "draft").toLowerCase() as ServiceListingStatus;
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

export type ServiceOrderBucket = "all" | "new" | "in_progress" | "awaiting_review" | "completed" | "cancelled";

export function classifyServiceOrder(order: ServiceOrderListItem): ServiceOrderBucket {
  if (isOrderExpiredOrCancelled(order.status, order.cancel_type)) {
    return "cancelled";
  }
  const stage = String(order.workflow_stage || "").toLowerCase();
  const escrow = String(order.escrow_status || "").toLowerCase();

  if (stage === "completion" && escrow === "released") return "completed";
  if (stage === "delivery" && order.delivered_at) return "awaiting_review";
  if (stage === "execution" || (stage === "escrow" && escrow === "funded")) return "in_progress";
  if (stage === "selection" && order.proposal_text && escrow === "funded") return "new";
  if (stage === "selection" && order.proposal_text) return "new";
  return "in_progress";
}

export const ORDER_BUCKET_LABELS: Record<ServiceOrderBucket, string> = {
  all: "Tất cả",
  new: "Đơn mới",
  in_progress: "Đang thực hiện",
  awaiting_review: "Chờ phản hồi",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export function filterOrdersByBucket(
  orders: ServiceOrderListItem[],
  bucket: ServiceOrderBucket,
): ServiceOrderListItem[] {
  if (bucket === "all") return orders;
  return orders.filter((o) => classifyServiceOrder(o) === bucket);
}

export function countOrdersByBucket(orders: ServiceOrderListItem[]): Record<ServiceOrderBucket, number> {
  return {
    all: orders.length,
    new: orders.filter((o) => classifyServiceOrder(o) === "new").length,
    in_progress: orders.filter((o) => classifyServiceOrder(o) === "in_progress").length,
    awaiting_review: orders.filter((o) => classifyServiceOrder(o) === "awaiting_review").length,
    completed: orders.filter((o) => classifyServiceOrder(o) === "completed").length,
    cancelled: orders.filter((o) => classifyServiceOrder(o) === "cancelled").length,
  };
}
