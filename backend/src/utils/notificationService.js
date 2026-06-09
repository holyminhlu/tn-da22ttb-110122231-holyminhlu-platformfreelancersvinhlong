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
  const { recipientId, actorId } = params;
  if (!recipientId) return null;
  if (actorId && String(recipientId) === String(actorId)) return null;
  return createNotification(db, { ...params, userId: recipientId });
}

function clientOrderHref(contractId) {
  return `/hire/orders/${contractId}`;
}

function freelancerOrderHref(contractId) {
  return `/findwork/orders/${contractId}`;
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
    title: "Client từ chối đề xuất",
    body: (ctx) => `Đề xuất của bạn cho đơn «${ctx.orderTitle}» đã bị từ chối.`,
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
    title: "Client chấp nhận đề xuất",
    body: (ctx) => `Đề xuất của bạn cho đơn «${ctx.orderTitle}» đã được chấp nhận. Chờ client nạp ký quỹ.`,
  },
  fund_escrow: {
    recipient: "freelancer",
    category: "order",
    action: "escrow_funded",
    title: "Client đã nạp ký quỹ",
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
    title: "Client yêu cầu chỉnh sửa",
    body: (ctx) => `Client yêu cầu chỉnh sửa cho đơn «${ctx.orderTitle}».`,
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
    title: "Client nghiệm thu bàn giao",
    body: (ctx) => `Client đã nghiệm thu đơn «${ctx.orderTitle}».`,
  },
  request_cancel_refund: {
    recipient: "freelancer",
    category: "order",
    action: "cancel_refund_requested",
    title: "Client yêu cầu hủy & hoàn tiền",
    body: (ctx) => `Client yêu cầu hủy và hoàn tiền cho đơn «${ctx.orderTitle}».`,
  },
  respond_cancel_request: {
    recipient: "client",
    category: "order",
    action: "cancel_refund_responded",
    title: "Freelancer phản hồi yêu cầu hủy",
    body: (ctx) =>
      ctx.agree
        ? `Freelancer đồng ý hủy đơn «${ctx.orderTitle}» và hoàn tiền.`
        : `Freelancer phản đối yêu cầu hủy đơn «${ctx.orderTitle}».`,
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
    body: (ctx) => `Client đã giải ngân thanh toán cho đơn «${ctx.orderTitle}».`,
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
  }

  if (!recipientId) return null;

  const isClientRecipient = String(recipientId) === String(contract.client_id);
  const href = isClientRecipient
    ? clientOrderHref(contract.id)
    : freelancerOrderHref(contract.id);

  const ctx = { actorName, orderTitle, agree: extra.agree };

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
    shortlist: {
      recipientId: quote.freelancer_id,
      category: "quote",
      action: "quote_shortlisted",
      title: "Bạn vào shortlist",
      body: `Hồ sơ của bạn cho «${title}» đã được đưa vào shortlist.`,
      href: "/findwork/quotes",
      entityType: "job_quote",
      entityId: quote.id,
    },
    interview: {
      recipientId: quote.freelancer_id,
      category: "quote",
      action: "quote_interview",
      title: "Mời phỏng vấn",
      body: `Client mời bạn phỏng vấn cho «${title}».`,
      href: "/findwork/quotes",
      entityType: "job_quote",
      entityId: quote.id,
    },
    offer: {
      recipientId: quote.freelancer_id,
      category: "quote",
      action: "quote_offered",
      title: "Nhận offer",
      body: `Client gửi offer cho «${title}».`,
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
    body: `Client gửi yêu cầu báo giá cho dịch vụ «${serviceTitle}».`,
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
    body: `Client đánh giá bạn ${stars} cho hợp đồng đã hoàn thành.`,
    href: freelancerOrderHref(contract.id),
    entityType: "contract",
    entityId: contract.id,
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
};
