import type { AppNotification } from "@/lib/api/notifications";

type ViewerRole = "client" | "freelancer" | "admin" | null;

const CLIENT_CONTRACT_ACTIONS = new Set([
  "proposal_submitted",
  "proposal_withdrawn",
  "progress_updated",
  "delivered",
  "cancel_refund_responded",
]);

const FREELANCER_CONTRACT_ACTIONS = new Set([
  "proposal_rejected",
  "proposal_accepted",
  "escrow_funded",
  "revision_requested",
  "payment_released",
  "order_created",
  "cancel_refund_requested",
]);

const DISPUTE_ACTIONS = new Set([
  "cancel_rejection_dispute",
  "dispute_opened",
  "open_dispute",
]);

function resolveOrderRoute(contractId: string | null, role: ViewerRole): string | null {
  if (!contractId) return null;
  if (role === "client") return `/hire/orders/${contractId}`;
  if (role === "freelancer") return `/findwork/orders/${contractId}`;
  return null;
}

function resolveDisputeRoute(contractId: string | null, role: ViewerRole): string | null {
  if (!contractId) return null;
  if (role === "client") return `/manage/tranh-chap?contract=${contractId}`;
  if (role === "freelancer") return `/dich-vu/tranh-chap?contract=${contractId}`;
  return null;
}

export function resolveNotificationHref(
  notification: AppNotification,
  viewerRole: ViewerRole,
): string | null {
  if (notification.href) return notification.href;

  const action = String(notification.action || "").toLowerCase();
  const entityType = String(notification.entityType || "").toLowerCase();
  const entityId = notification.entityId || null;
  const category = String(notification.category || "").toLowerCase();

  if (action.startsWith("withdrawal_")) return "/payments";
  if (action.startsWith("identity_review_")) return "/edit-account/xac-minh";
  if (action === "security_new_login") return "/edit-account/bao-mat";

  if (entityType === "conversation" || action === "message_received") {
    if (!entityId) return viewerRole === "client" ? "/hire/messages" : "/findwork/messages";
    return viewerRole === "client"
      ? `/hire/messages?c=${entityId}`
      : `/findwork/messages?c=${entityId}`;
  }

  if (entityType === "job_quote" || action.startsWith("quote_")) {
    return viewerRole === "client" ? "/hire/quotes" : "/findwork/quotes";
  }

  if (entityType === "contract" || category === "order") {
    if (DISPUTE_ACTIONS.has(action)) {
      return resolveDisputeRoute(entityId, viewerRole);
    }
    if (CLIENT_CONTRACT_ACTIONS.has(action)) {
      return entityId ? `/hire/orders/${entityId}` : "/manage/phong-lam-viec";
    }
    if (FREELANCER_CONTRACT_ACTIONS.has(action)) {
      return entityId ? `/findwork/orders/${entityId}` : "/dich-vu/don-hang";
    }
    return resolveOrderRoute(entityId, viewerRole);
  }

  if (category === "message") {
    return viewerRole === "client" ? "/hire/messages" : "/findwork/messages";
  }
  if (category === "review") return null;
  if (category === "quote") return viewerRole === "client" ? "/hire/quotes" : "/findwork/quotes";

  return null;
}
