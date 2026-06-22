const { isInAppNotificationAllowed } = require("./notificationPreferences");

let ioInstance = null;

function setNotificationIo(io) {
  ioInstance = io;
}

function mapNotificationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    action: row.action,
    title: row.title,
    body: row.body || "",
    href: row.href || null,
    actorId: row.actor_id || null,
    actorName: row.actor_name || null,
    entityType: row.entity_type || null,
    entityId: row.entity_id || null,
    readAt: row.read_at || null,
    createdAt: row.created_at,
  };
}

async function getActorName(db, actorId) {
  if (!actorId) return null;
  const result = await db.query(
    `SELECT COALESCE(up.full_name, u.email) AS name
     FROM public.users u
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [actorId],
  );
  return result.rows[0]?.name || "Người dùng";
}

async function createNotification(db, params) {
  const {
    userId,
    category,
    action,
    title,
    body = "",
    href = null,
    actorId = null,
    actorName = null,
    entityType = null,
    entityId = null,
  } = params;

  if (!userId || !action || !title) return null;

  let resolvedActorName = actorName;
  if (actorId && !resolvedActorName) {
    resolvedActorName = await getActorName(db, actorId);
  }

  const insert = await db.query(
    `INSERT INTO public.notifications (
       user_id, category, action, title, body, href,
       actor_id, actor_name, entity_type, entity_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      userId,
      category || "system",
      action,
      title,
      body,
      href,
      actorId,
      resolvedActorName,
      entityType,
      entityId,
    ],
  );

  const notification = mapNotificationRow(insert.rows[0]);

  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit("notification:new", notification);
  }

  return notification;
}

async function notifyUser(db, params) {
  const { recipientId, actorId, category, action } = params;
  if (!recipientId) return null;
  if (actorId && String(recipientId) === String(actorId)) return null;

  const allowed = await isInAppNotificationAllowed(db, recipientId, { category, action });
  if (!allowed) return null;

  return createNotification(db, { ...params, userId: recipientId });
}

function clientOrderHref(contractId) {
  return `/hire/orders/${contractId}`;
}

function freelancerOrderHref(contractId) {
  return `/dich-vu/don-hang/${contractId}`;
}

function clientMessagesHref(conversationId) {
  return conversationId ? `/hire/messages?c=${conversationId}` : "/hire/messages";
}

function freelancerMessagesHref(conversationId) {
  return conversationId ? `/findwork/messages?c=${conversationId}` : "/findwork/messages";
}

const WORKFLOW_NOTIFICATIONS = {
  submit_proposal: {
    recipient: "client",
    category: "order",
    action: "proposal_submitted",
    title: "Freelancer gửi đề xuất",
    body: (ctx) => `${ctx.actorName} đã gửi đề xuất cho đơn «${ctx.orderTitle}».`,
  },
  withdraw_proposal: {
    recipient: "client",
    category: "order",
    action: "proposal_withdrawn",
    title: "Freelancer rút đề xuất",
    body: (ctx) => `${ctx.actorName} đã rút đề xuất cho đơn «${ctx.orderTitle}».`,
  },
  reject_proposal: {
    recipient: "freelancer",
    category: "order",
    action: "proposal_rejected",
    title: "Khách hàng từ chối đề xuất",
    body: (ctx) => {
      const base = `Đề xuất của bạn cho đơn «${ctx.orderTitle}» đã bị từ chối.`;
      if (ctx.rejectionNote) return `${base} Lý do: ${ctx.rejectionNote}`;
      return base;
    },
  },
  cancel_order: {
    recipient: "counterparty",
    category: "order",
    action: "order_cancelled",
    title: "Đơn hàng đã hủy",
    body: (ctx) => `Đơn «${ctx.orderTitle}» đã được hủy trước khi nạp ký quỹ.`,
  },
  accept_proposal: {
    recipient: "freelancer",
    category: "order",
    action: "proposal_accepted",
    title: "Khách hàng chấp nhận đề xuất",
    body: (ctx) => `Đề xuất của bạn cho đơn «${ctx.orderTitle}» đã được chấp nhận. Chờ khách hàng nạp ký quỹ.`,
  },
  fund_escrow: {
    recipient: "freelancer",
    category: "order",
    action: "escrow_funded",
    title: "Khách hàng đã nạp ký quỹ",
    body: (ctx) => `Ký quỹ cho đơn «${ctx.orderTitle}» đã được nạp. Bạn có thể bắt đầu làm việc.`,
  },
  update_progress: {
    recipient: "client",
    category: "order",
    action: "progress_updated",
    title: "Freelancer cập nhật tiến độ",
    body: (ctx) => `${ctx.actorName} đã cập nhật tiến độ cho đơn «${ctx.orderTitle}».`,
  },
  request_revision: {
    recipient: "freelancer",
    category: "order",
    action: "revision_requested",
    title: "Khách hàng yêu cầu chỉnh sửa",
    body: (ctx) => `Khách hàng yêu cầu chỉnh sửa cho đơn «${ctx.orderTitle}».`,
  },
  mark_delivered: {
    recipient: "client",
    category: "order",
    action: "delivered",
    title: "Freelancer bàn giao công việc",
    body: (ctx) => `${ctx.actorName} đã bàn giao đơn «${ctx.orderTitle}». Vui lòng nghiệm thu.`,
  },
  accept_delivery: {
    recipient: "freelancer",
    category: "order",
    action: "delivery_accepted",
    title: "Khách hàng nghiệm thu bàn giao",
    body: (ctx) => `Khách hàng đã nghiệm thu đơn «${ctx.orderTitle}».`,
  },
  request_cancel_refund: {
    recipient: "freelancer",
    category: "order",
    action: "cancel_refund_requested",
    title: "Khách hàng yêu cầu hủy & hoàn tiền",
    body: (ctx) => `Khách hàng yêu cầu hủy và hoàn tiền cho đơn «${ctx.orderTitle}».`,
  },
  respond_cancel_request: {
    recipient: "client",
    category: "order",
    action: "cancel_refund_responded",
    title: "Freelancer phản hồi yêu cầu hủy",
    body: (ctx) =>
      ctx.agree
        ? `Freelancer đồng ý hủy đơn «${ctx.orderTitle}» và hoàn tiền.`
        : `Freelancer phản đối yêu cầu hủy đơn «${ctx.orderTitle}». Đơn chuyển sang tranh chấp — Admin sẽ phán xử.`,
  },
  cancel_rejection_dispute: {
    recipient: "both_parties",
    category: "order",
    action: "cancel_rejection_dispute",
    title: "Tranh chấp hủy đơn — cần bổ sung bằng chứng",
    body: (ctx) =>
      `Đơn «${ctx.orderTitle}» đang tranh chấp sau khi Freelancer phản đối yêu cầu hủy. ` +
      `Vui lòng nộp bằng chứng trong ${ctx.evidenceDays || 2} ngày tại Trung tâm giải quyết.`,
  },
  open_dispute: {
    recipient: "counterparty",
    category: "order",
    action: "dispute_opened",
    title: "Tranh chấp được mở",
    body: (ctx) => `${ctx.actorName} đã mở tranh chấp cho đơn «${ctx.orderTitle}».`,
  },
  release_payment: {
    recipient: "freelancer",
    category: "order",
    action: "payment_released",
    title: "Thanh toán đã giải ngân",
    body: (ctx) => `Khách hàng đã giải ngân thanh toán cho đơn «${ctx.orderTitle}».`,
  },
};

async function notifyWorkflowAction(db, contract, action, actorId, extra = {}) {
  const config = WORKFLOW_NOTIFICATIONS[action];
  if (!config) return null;

  const orderTitle =
    contract.service_title || contract.job_title || "Đơn hàng dịch vụ";
  const actorName = await getActorName(db, actorId);

  let recipientId = null;
  if (config.recipient === "client") {
    recipientId = contract.client_id;
  } else if (config.recipient === "freelancer") {
    recipientId = contract.freelancer_id;
  } else if (config.recipient === "counterparty") {
    recipientId =
      String(actorId) === String(contract.client_id)
        ? contract.freelancer_id
        : contract.client_id;
  } else if (config.recipient === "both_parties") {
    const evidenceDays = extra.evidenceDays ?? 2;
    const ctx = { actorName, orderTitle, evidenceDays };
    const body = typeof config.body === "function" ? config.body(ctx) : config.body;
    const basePayload = {
      actorId,
      category: config.category,
      action: config.action,
      title: config.title,
      body,
      entityType: "contract",
      entityId: contract.id,
    };
    await notifyUser(db, {
      ...basePayload,
      recipientId: contract.client_id,
      href: `/manage/tranh-chap?contract=${contract.id}`,
    });
    await notifyUser(db, {
      ...basePayload,
      recipientId: contract.freelancer_id,
      href: `/dich-vu/tranh-chap?contract=${contract.id}`,
    });
    return null;
  }

  if (!recipientId) return null;

  const isClientRecipient = String(recipientId) === String(contract.client_id);
  const href = isClientRecipient
    ? clientOrderHref(contract.id)
    : freelancerOrderHref(contract.id);

  const ctx = { actorName, orderTitle, agree: extra.agree, rejectionNote: extra.rejectionNote };

  return notifyUser(db, {
    recipientId,
    actorId,
    category: config.category,
    action: config.action,
    title: config.title,
    body: typeof config.body === "function" ? config.body(ctx) : config.body,
    href,
    entityType: "contract",
    entityId: contract.id,
  });
}

async function notifyQuoteAction(db, { action, quote, jobTitle, actorId }) {
  const actorName = await getActorName(db, actorId);
  const title = jobTitle || "Công việc";

  const configs = {
    submitted: {
      recipientId: quote.client_id,
      category: "quote",
      action: "quote_submitted",
      title: "Báo giá mới",
      body: `${actorName} đã gửi báo giá cho «${title}».`,
      href: `/hire/joblist/${quote.job_id}`,
      entityType: "job_quote",
      entityId: quote.id,
    },
    interview: {
      recipientId: quote.freelancer_id,
      category: "quote",
      action: "quote_interview",
      title: "Mời phỏng vấn",
      body: `Khách hàng mời bạn phỏng vấn cho «${title}».`,
      href: "/findwork/quotes",
      entityType: "job_quote",
      entityId: quote.id,
    },
    offer: {
      recipientId: quote.freelancer_id,
      category: "quote",
      action: "quote_offered",
      title: "Nhận offer",
      body: `Khách hàng gửi offer cho «${title}».`,
      href: "/findwork/quotes",
      entityType: "job_quote",
      entityId: quote.id,
    },
    accept: {
      recipientId: quote.freelancer_id,
      category: "quote",
      action: "quote_accepted",
      title: "Được tuyển",
      body: `Bạn đã được chọn cho «${title}». Hợp đồng đã được tạo.`,
      href: "/findwork/quotes",
      entityType: "job_quote",
      entityId: quote.id,
    },
    decline: {
      recipientId: quote.freelancer_id,
      category: "quote",
      action: "quote_declined",
      title: "Báo giá bị từ chối",
      body: `Báo giá của bạn cho «${title}» đã bị từ chối.`,
      href: "/findwork/quotes",
      entityType: "job_quote",
      entityId: quote.id,
    },
    withdraw: {
      recipientId: quote.client_id,
      category: "quote",
      action: "quote_withdrawn",
      title: "Freelancer rút báo giá",
      body: `${actorName} đã rút báo giá cho «${title}».`,
      href: `/hire/joblist/${quote.job_id}`,
      entityType: "job_quote",
      entityId: quote.id,
    },
  };

  const config = configs[action];
  if (!config) return null;

  return notifyUser(db, {
    recipientId: config.recipientId,
    actorId,
    category: config.category,
    action: config.action,
    title: config.title,
    body: config.body,
    href: config.href,
    entityType: config.entityType,
    entityId: config.entityId,
  });
}

async function notifyServiceOrderCreated(db, contract, serviceTitle, actorId) {
  return notifyUser(db, {
    recipientId: contract.freelancer_id,
    actorId,
    category: "order",
    action: "order_created",
    title: "Yêu cầu đơn hàng mới",
    body: `Khách hàng gửi yêu cầu báo giá cho dịch vụ «${serviceTitle}».`,
    href: freelancerOrderHref(contract.id),
    entityType: "contract",
    entityId: contract.id,
  });
}

async function notifyChatMessage(db, conversation, senderId, bodyPreview) {
  const recipientId =
    String(senderId) === String(conversation.client_id)
      ? conversation.freelancer_id
      : conversation.client_id;

  const actorName = await getActorName(db, senderId);
  const preview =
    bodyPreview.length > 120 ? `${bodyPreview.slice(0, 117)}...` : bodyPreview;

  const isClientRecipient = String(recipientId) === String(conversation.client_id);
  const href = isClientRecipient
    ? clientMessagesHref(conversation.id)
    : freelancerMessagesHref(conversation.id);

  return notifyUser(db, {
    recipientId,
    actorId: senderId,
    category: "message",
    action: "message_received",
    title: `Tin nhắn từ ${actorName}`,
    body: preview,
    href,
    entityType: "conversation",
    entityId: conversation.id,
  });
}

async function notifyReviewReceived(db, contract, rating, actorId) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  return notifyUser(db, {
    recipientId: contract.freelancer_id,
    actorId,
    category: "review",
    action: "review_received",
    title: "Đánh giá mới",
    body: `Khách hàng đánh giá bạn ${stars} cho hợp đồng đã hoàn thành.`,
    href: freelancerOrderHref(contract.id),
    entityType: "contract",
    entityId: contract.id,
  });
}

async function notifyIdentityReviewApproved(db, userId, actorId, role = "freelancer") {
  const isClient = String(role).toLowerCase() === "client";
  return notifyUser(db, {
    recipientId: userId,
    actorId,
    category: "system",
    action: "identity_review_approved",
    title: "Hồ sơ xác minh đã được duyệt",
    body: isClient
      ? "Xác minh danh tính của bạn đã được admin phê duyệt."
      : "Xác minh danh tính của bạn đã được admin phê duyệt. Bạn có thể báo giá và thao tác với job.",
    href: "/edit-account/xac-minh",
    entityType: "identity_verification",
    entityId: userId,
  });
}

async function notifyIdentityReviewRejected(db, userId, actorId, note, role = "freelancer") {
  const trimmed = String(note || "").trim();
  return notifyUser(db, {
    recipientId: userId,
    actorId,
    category: "system",
    action: "identity_review_rejected",
    title: "Hồ sơ xác minh chưa được duyệt",
    body: trimmed
      ? `Admin từ chối hồ sơ: ${trimmed}`
      : "Admin từ chối hồ sơ xác minh. Vui lòng cập nhật thông tin và gửi lại.",
    href: "/edit-account/xac-minh",
    entityType: "identity_verification",
    entityId: userId,
  });
}

async function notifyIdentityReviewSubmitted(db, userId) {
  return notifyUser(db, {
    recipientId: userId,
    category: "system",
    action: "identity_review_submitted",
    title: "Hồ sơ đã gửi xem xét",
    body: "Hồ sơ xác minh danh tính của bạn đã được gửi. Admin sẽ duyệt trong 2–5 ngày làm việc.",
    href: "/edit-account/xac-minh",
    entityType: "identity_verification",
    entityId: userId,
  });
}

async function notifyNewLogin(db, userId, { ipAddress, deviceLabel }) {
  const ip = ipAddress || "không xác định";
  const device = deviceLabel || "thiết bị mới";
  return notifyUser(db, {
    recipientId: userId,
    category: "system",
    action: "security_new_login",
    title: "Đăng nhập từ thiết bị hoặc vị trí mới",
    body: `Phát hiện đăng nhập từ ${device} (IP: ${ip}). Nếu không phải bạn, hãy đổi mật khẩu và đăng xuất các thiết bị khác.`,
    href: "/edit-account/bao-mat",
    entityType: "security",
    entityId: userId,
  });
}

module.exports = {
  setNotificationIo,
  mapNotificationRow,
  createNotification,
  notifyUser,
  notifyWorkflowAction,
  notifyQuoteAction,
  notifyServiceOrderCreated,
  notifyChatMessage,
  notifyReviewReceived,
  notifyIdentityReviewApproved,
  notifyIdentityReviewRejected,
  notifyIdentityReviewSubmitted,
  notifyNewLogin,
};
