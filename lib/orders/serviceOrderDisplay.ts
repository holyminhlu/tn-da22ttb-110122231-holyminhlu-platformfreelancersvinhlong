import type { ServiceOrderListItem } from "@/lib/api/contracts";
import { formatDisplayTitle, markdownToPlainText } from "@/lib/text/displayText";
import { cancelTypeLabel, isOrderExpiredOrCancelled } from "./workflowSlaDisplay";

const STAGE_LABELS: Record<string, string> = {  selection: "Chốt thỏa thuận",
  escrow: "Ký quỹ",
  execution: "Thực hiện",
  delivery: "Bàn giao",
  completion: "Hoàn tất",
};

export function workflowStageLabel(stage: string): string {
  return STAGE_LABELS[String(stage).toLowerCase()] || stage;
}

export function escrowStatusLabel(status: string | null | undefined): string {
  const s = String(status || "none").toLowerCase();
  if (s === "funded") return "Đã nạp";
  if (s === "released") return "Đã giải ngân";
  if (s === "pending") return "Chưa nạp";
  if (s === "held") return "Đang giữ";
  if (s === "refunded") return "Đã hoàn";
  if (s === "none" || !s) return "Chưa có";
  return status || "—";
}

export function orderCardTitle(
  serviceTitle: string | null | undefined,
  jobTitle: string | null | undefined,
  fallback = "Đơn dịch vụ",
): string {
  const raw = serviceTitle?.trim() || jobTitle?.trim() || fallback;
  return formatDisplayTitle(raw);
}

export function orderCardPreviewText(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return markdownToPlainText(trimmed);
}

export function parsePackageName(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const name = (snapshot as { name?: string }).name;
  return name?.trim() || null;
}

export function orderStatusHint(order: ServiceOrderListItem, asFreelancer: boolean): string {
  if (isOrderExpiredOrCancelled(order.status, order.cancel_type)) {
    return cancelTypeLabel(order.cancel_type) || "Đã hủy";
  }
  const stage = String(order.workflow_stage || "").toLowerCase();  const escrow = String(order.escrow_status || "").toLowerCase();

  if (asFreelancer) {
    if (stage === "selection" && !order.proposal_text) {
      return "Cần gửi đề xuất";
    }
    if (stage === "selection" && order.proposal_text) {
      return "Chờ Client chấp nhận";
    }
    if (stage === "escrow" && escrow !== "funded") {
      return "Chờ Client nạp Escrow";
    }
    if (stage === "execution") {
      return "Đang thực hiện";
    }
    if (stage === "delivery" && order.delivered_at) {
      return "Chờ Client nghiệm thu";
    }
    if (stage === "delivery") {
      return "Cần bàn giao";
    }
    if (stage === "completion" && escrow === "released") {
      return "Đã giải ngân";
    }
    if (stage === "completion") {
      return "Chờ giải ngân";
    }
  } else {
    if (stage === "selection" && !order.proposal_text) {
      return "Chờ đề xuất freelancer";
    }
    if (stage === "selection" && order.proposal_text) {
      return "Cần chấp nhận đề xuất";
    }
    if (stage === "escrow" && escrow !== "funded") {
      return "Cần nạp Escrow";
    }
  }

  return workflowStageLabel(stage);
}

export type OrderCardStatusTone =
  | "success"
  | "danger"
  | "warning"
  | "active"
  | "delivery"
  | "escrow"
  | "waiting"
  | "neutral";

/** Màu badge/chip chính trên card đơn dịch vụ. */
export function orderCardStatusTone(
  order: ServiceOrderListItem,
  asFreelancer: boolean,
): OrderCardStatusTone {
  if (isOrderExpiredOrCancelled(order.status, order.cancel_type)) {
    return "danger";
  }

  const stage = String(order.workflow_stage || "").toLowerCase();
  const escrow = String(order.escrow_status || "").toLowerCase();

  if (stage === "completion") {
    return escrow === "released" ? "success" : "warning";
  }
  if (stage === "execution") return "active";
  if (stage === "delivery") return "delivery";

  if (stage === "escrow") {
    if (escrow === "funded") return "escrow";
    return asFreelancer ? "waiting" : "warning";
  }

  if (stage === "selection") {
    if (asFreelancer && !order.proposal_text) return "warning";
    if (!asFreelancer && order.proposal_text) return "warning";
    return "waiting";
  }

  return "neutral";
}

export function workflowStageTone(
  stage: string,
  order?: Pick<ServiceOrderListItem, "status" | "cancel_type" | "escrow_status">,
): OrderCardStatusTone {
  if (order && isOrderExpiredOrCancelled(order.status, order.cancel_type)) {
    return "danger";
  }

  const s = String(stage || "").toLowerCase();
  const escrow = String(order?.escrow_status || "").toLowerCase();

  if (s === "completion") return escrow === "released" ? "success" : "warning";
  if (s === "execution") return "active";
  if (s === "delivery") return "delivery";
  if (s === "escrow") return escrow === "funded" ? "escrow" : "waiting";
  if (s === "selection") return "waiting";
  return "neutral";
}

export function escrowStatusTone(status: string | null | undefined): OrderCardStatusTone {
  const s = String(status || "none").toLowerCase();
  if (s === "released") return "success";
  if (s === "funded") return "active";
  if (s === "refunded") return "danger";
  if (s === "pending" || s === "none" || !s) return "waiting";
  return "escrow";
}

export function orderDeadlineTone(deadlineLine: string | null | undefined): OrderCardStatusTone {
  if (!deadlineLine) return "warning";
  if (deadlineLine.includes("Hết hạn")) return "danger";
  return "warning";
}

export function orderBucketTone(bucket: string): OrderCardStatusTone {
  switch (bucket) {
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    case "new":
    case "awaiting_review":
      return "warning";
    case "in_progress":
      return "active";
    default:
      return "neutral";
  }
}

export function orderStatusBadgeClass(tone: OrderCardStatusTone): string {
  return `fw-orders__card-badge fw-orders__card-badge--${tone}`;
}

export function orderStatusChipClass(tone: OrderCardStatusTone): string {
  return `fw-orders__card-chip fw-orders__card-chip--${tone}`;
}

export function orderCardToneClass(tone: OrderCardStatusTone): string {
  return `fw-orders__card--tone-${tone}`;
}

export type OrderListFilter = "all" | "action" | "active" | "done";

export function filterServiceOrders(
  orders: ServiceOrderListItem[],
  filter: OrderListFilter,
  asFreelancer: boolean,
): ServiceOrderListItem[] {
  if (filter === "all") return orders;

  return orders.filter((order) => {
    const stage = String(order.workflow_stage || "").toLowerCase();
    const escrow = String(order.escrow_status || "").toLowerCase();

    if (filter === "done") {
      return stage === "completion" && escrow === "released";
    }

    if (filter === "active") {
      return stage === "execution" || stage === "delivery" || (stage === "escrow" && escrow === "funded");
    }

    if (filter === "action") {
      if (asFreelancer) {
        if (stage === "selection" && !order.proposal_text) return true;
        if (stage === "execution") return true;
        if (stage === "delivery" && !order.delivered_at) return true;
        return false;
      }
      if (stage === "selection" && order.proposal_text) return true;
      if (stage === "escrow" && escrow !== "funded") return true;
      if (stage === "execution" || stage === "delivery") return true;
      if (stage === "completion" && escrow === "funded") return true;
    }

    return true;
  });
}
