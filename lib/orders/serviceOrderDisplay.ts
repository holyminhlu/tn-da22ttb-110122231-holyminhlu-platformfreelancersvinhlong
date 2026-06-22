import type { ServiceOrderListItem } from "@/lib/api/contracts";
import { tUi } from "@/lib/i18n/runtime";
import { formatDisplayTitle, markdownToPlainText } from "@/lib/text/displayText";
import { cancelTypeLabel, isAwaitingClientAcceptance, isContractDisputed, isOrderExpiredOrCancelled } from "./workflowSlaDisplay";

export function workflowStageLabel(stage: string): string {
  const s = String(stage).toLowerCase();
  if (s === "selection") return tUi("dashboardPage.stageSelection");
  if (s === "escrow") return tUi("dashboardPage.stageEscrow");
  if (s === "execution") return tUi("dashboardPage.stageExecution");
  if (s === "delivery") return tUi("dashboardPage.stageDelivery");
  if (s === "completion") return tUi("dashboardPage.stageCompletion");
  return stage;
}

export function escrowStatusLabel(status: string | null | undefined): string {
  const s = String(status || "none").toLowerCase();
  if (s === "funded") return tUi("hireOrders.escrowFunded");
  if (s === "released") return tUi("hireOrders.escrowReleased");
  if (s === "pending") return tUi("hireOrders.escrowPending");
  if (s === "held") return tUi("hireOrders.escrowHeld");
  if (s === "refunded") return tUi("hireOrders.escrowRefunded");
  if (s === "none" || !s) return tUi("hireOrders.escrowNone");
  return status || "—";
}

export function orderCardTitle(
  serviceTitle: string | null | undefined,
  jobTitle: string | null | undefined,
  fallback = tUi("hireOrders.orderFallback"),
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
  if (isContractDisputed(order.status)) {
    return "Đang tranh chấp";
  }
  if (isOrderExpiredOrCancelled(order.status, order.cancel_type)) {
    return cancelTypeLabel(order.cancel_type) || "Đã hủy";
  }
  const stage = String(order.workflow_stage || "").toLowerCase();  const escrow = String(order.escrow_status || "").toLowerCase();

  if (asFreelancer) {
    if (stage === "selection" && !order.proposal_text) {
      return "Cần gửi đề xuất";
    }
    if (stage === "selection" && order.proposal_text) {
      return "Chờ Khách hàng chấp nhận";
    }
    if (stage === "escrow" && escrow !== "funded") {
      return "Chờ Khách hàng nạp Escrow";
    }
    if (stage === "execution") {
      if (order.delivered_at && !order.accepted_at) {
        return "Cần nghiệm thu bàn giao";
      }
      return "Đang thực hiện";
    }
    if (stage === "delivery" && order.delivered_at) {
      return "Chờ Khách hàng nghiệm thu";
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
    if (stage === "execution" && order.delivered_at && !order.accepted_at) {
      return "Cần nghiệm thu bàn giao";
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
  if (isContractDisputed(order.status)) {
    return "warning";
  }
  if (isOrderExpiredOrCancelled(order.status, order.cancel_type)) {
    return "danger";
  }

  const stage = String(order.workflow_stage || "").toLowerCase();
  const escrow = String(order.escrow_status || "").toLowerCase();

  if (stage === "completion") {
    return escrow === "released" ? "success" : "warning";
  }
  if (stage === "execution") {
    if (!asFreelancer && order.delivered_at && !order.accepted_at) return "delivery";
    return "active";
  }
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
        if (stage === "execution" && !order.delivered_at) return true;
        if (stage === "delivery" && !order.delivered_at) return true;
        return false;
      }
      if (stage === "selection" && order.proposal_text) return true;
      if (stage === "escrow" && escrow !== "funded") return true;
      if (stage === "execution") return true;
      if (stage === "delivery" && !order.accepted_at) return true;
      if (stage === "completion" && escrow === "funded") return true;
    }

    return true;
  });
}
