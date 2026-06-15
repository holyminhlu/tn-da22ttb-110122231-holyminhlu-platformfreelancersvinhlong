/** Hiển thị deadline SLA trên UI workflow */

export function parseDeadline(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function msUntilDeadline(iso: string | null | undefined): number | null {
  const d = parseDeadline(iso);
  if (!d) return null;
  return d.getTime() - Date.now();
}

export function formatDeadlineCountdown(iso: string | null | undefined): string | null {
  const ms = msUntilDeadline(iso);
  if (ms == null) return null;
  if (ms <= 0) return "Đã hết hạn — hệ thống sẽ xử lý tự động";

  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
  if (totalHours > 0) return `Còn ${totalHours} giờ`;
  const minutes = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `Còn ${minutes} phút`;
}

export function cancelTypeLabel(cancelType: string | null | undefined): string {
  switch (String(cancelType || "").toLowerCase()) {
    case "expired":
      return "Hết hạn";
    case "withdrawn":
      return "Freelancer hủy";
    case "rejected":
      return "Client hủy / từ chối";
    case "refund":
      return "Đã hoàn tiền";
    case "mutual":
      return "Hủy thỏa thuận";
    default:
      return cancelType || "—";
  }
}

export function isContractDisputed(status: string | null | undefined): boolean {
  return String(status || "").toLowerCase() === "disputed";
}

export function isOrderExpiredOrCancelled(
  status: string,
  cancelType: string | null | undefined,
): boolean {
  if (cancelType) return true;
  const s = String(status).toLowerCase();
  return s === "cancelled";
}

type OrderDeadlineFields = {
  status: string;
  cancel_type?: string | null;
  workflow_stage: string;
  stage_deadline_at?: string | null;
  escrow_deadline_at?: string | null;
  delivery_review_deadline_at?: string | null;
  delivered_at?: string | null;
};

/** Deadline SLA áp dụng cho đơn trên list */
export function orderEffectiveDeadline(order: OrderDeadlineFields): string | null {
  if (isContractDisputed(order.status)) return null;
  if (isOrderExpiredOrCancelled(order.status, order.cancel_type)) return null;

  const stage = String(order.workflow_stage || "").toLowerCase();
  if (stage === "delivery" && order.delivered_at && order.delivery_review_deadline_at) {
    return order.delivery_review_deadline_at;
  }
  if (stage === "escrow") {
    return order.escrow_deadline_at || order.stage_deadline_at || null;
  }
  return order.stage_deadline_at || null;
}

export function orderDeadlineSubtitle(order: OrderDeadlineFields): string | null {
  const iso = orderEffectiveDeadline(order);
  if (!iso) return null;
  const countdown = formatDeadlineCountdown(iso);
  if (!countdown) return null;
  if (countdown.startsWith("Đã hết hạn")) return "Hết hạn — chờ xử lý tự động";
  return countdown;
}
