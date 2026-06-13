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
