import type { AppNotification } from "@/lib/api/notifications";
import { ROUTES, serviceOrderHref } from "@/lib/routes/paths";
import { disputeCenterPath } from "@/lib/orders/resolutionLinks";

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
  if (role === "client") return serviceOrderHref(contractId, "client");
  if (role === "freelancer") return serviceOrderHref(contractId, "freelancer");
  return null;
}

function resolveDisputeRoute(contractId: string | null, role: ViewerRole): string | null {
  if (!contractId) return null;
  if (role === "client" || role === "freelancer") {
    return disputeCenterPath(role, { contractId });
  }
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

  if (action.startsWith("withdrawal_")) return ROUTES.payments.hub;
  if (action.startsWith("identity_review_")) return ROUTES.account.verify;
  if (action === "security_new_login") return ROUTES.account.security;

  if (entityType === "conversation" || action === "message_received") {
    if (!entityId) {
      return viewerRole === "client" ? ROUTES.hire.messages : ROUTES.findwork.messages;
    }
    return viewerRole === "client"
      ? `${ROUTES.hire.messages}?c=${entityId}`
      : `${ROUTES.findwork.messages}?c=${entityId}`;
  }

  if (entityType === "job_quote" || action.startsWith("quote_")) {
    return viewerRole === "client" ? ROUTES.hire.quotes : ROUTES.findwork.quotes;
  }

  if (entityType === "contract" || category === "order") {
    if (DISPUTE_ACTIONS.has(action)) {
      return resolveDisputeRoute(entityId, viewerRole);
    }
    if (CLIENT_CONTRACT_ACTIONS.has(action)) {
      return entityId ? serviceOrderHref(entityId, "client") : ROUTES.manage.workspace;
    }
    if (FREELANCER_CONTRACT_ACTIONS.has(action)) {
      return entityId ? serviceOrderHref(entityId, "freelancer") : ROUTES.services.orders;
    }
    return resolveOrderRoute(entityId, viewerRole);
  }

  if (category === "message") {
    return viewerRole === "client" ? ROUTES.hire.messages : ROUTES.findwork.messages;
  }
  if (category === "review") return null;
  if (category === "quote") {
    return viewerRole === "client" ? ROUTES.hire.quotes : ROUTES.findwork.quotes;
  }

  return null;
}
