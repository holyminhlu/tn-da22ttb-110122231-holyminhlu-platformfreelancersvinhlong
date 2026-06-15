/**
 * Cấu hình gọi REST backend — một nguồn cho base URL và đường dẫn endpoint.
 */

export const DEFAULT_API_BASE_URL = "http://localhost:5000";

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : DEFAULT_API_BASE_URL;
}

export function normalizeApiBase(base: string): string {
  return base.replace(/\/+$/, "");
}

/** URL tuyệt đối tới backend: `base` + `path` (path luôn bắt đầu bằng `/`). */
export function apiUrl(path: string, base: string = getApiBaseUrl()): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeApiBase(base)}${normalizedPath}`;
}

/** Đường dẫn tương đối (prefix `/api/...`) — ghép với base qua `apiUrl` hoặc `fetchApi`. */
export const apiPaths = {
  auth: {
    google: "/api/auth/google",
    googleComplete: "/api/auth/google/complete",
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    refresh: "/api/auth/refresh",
  },
  users: {
    me: "/api/users/me",
    credentials: "/api/users/me/credentials",
    feedback: "/api/users/me/feedback",
    profileStats: "/api/users/me/profile-stats",
    identityVerification: "/api/users/me/identity-verification",
    identitySelfie: "/api/users/me/identity-verification/selfie",
    identityIdFront: "/api/users/me/identity-verification/id-front",
    identityIdBack: "/api/users/me/identity-verification/id-back",
    identityAddressProof: "/api/users/me/identity-verification/address-proof",
    identityCard: "/api/users/me/identity-verification/card",
    identityCardVerifyCharge: "/api/users/me/identity-verification/card/verify-charge",
    identityCardPaymentLink: "/api/users/me/identity-verification/card/payment-link",
    identityCardPaymentStatus: (orderCode: string | number) =>
      `/api/users/me/identity-verification/card/payment-status/${encodeURIComponent(String(orderCode))}`,
    identityCardPaymentCancel: (orderCode: string | number) =>
      `/api/users/me/identity-verification/card/payment-status/${encodeURIComponent(String(orderCode))}/cancel`,
    profile: "/api/users/me/profile",
    changeEmail: "/api/users/me/email",
    changePassword: "/api/users/me/password",
    avatar: "/api/users/me/avatar",
    security: "/api/users/me/security",
    securitySessions: "/api/users/me/security/sessions",
    securitySession: (sessionId: string) =>
      `/api/users/me/security/sessions/${encodeURIComponent(sessionId)}`,
    securityRevokeOthers: "/api/users/me/security/sessions/revoke-others",
    securityLoginHistory: "/api/users/me/security/login-history",
    securityRecovery: "/api/users/me/security/recovery",
    securityDeactivate: "/api/users/me/security/deactivate",
    securityDeleteAccount: "/api/users/me/security/account",
    skills: "/api/users/me/skills",
    portfolio: "/api/users/me/portfolio",
    exclusiveResources: "/api/users/me/exclusive-resources",
    profileFiles: "/api/users/me/profile-files",
    profileFileUpload: "/api/users/me/profile-file-upload",
  },
  contracts: {
    list: "/api/contracts",
    myWork: "/api/contracts/my-work",
    serviceOrders: "/api/contracts/service-orders",
    refundRequests: "/api/contracts/resolution/refund-requests",
    disputes: "/api/contracts/resolution/disputes",
    disputeEvidence: "/api/contracts/resolution/dispute-evidence",
    dispute: (disputeId: string) => `/api/contracts/resolution/disputes/${encodeURIComponent(disputeId)}`,
    disputeMessages: (disputeId: string) =>
      `/api/contracts/resolution/disputes/${encodeURIComponent(disputeId)}/messages`,
    fromServiceQuote: "/api/contracts/from-service-quote",
    workflow: (contractId: string) => `/api/contracts/${contractId}/workflow`,
    review: (contractId: string) => `/api/contracts/${contractId}/review`,
    patch: (contractId: string) => `/api/contracts/${contractId}`,
  },
  freelancers: {
    list: "/api/freelancers",
    topSkills: "/api/freelancers/top-skills",
    topLocations: "/api/freelancers/top-locations",
    detail: (id: string) => `/api/freelancers/${id}`,
    /** Legacy — tương thích client cũ */
    listLegacy: "/api/auth/freelancers",
    detailLegacy: (id: string) => `/api/auth/freelancers/${id}`,
  },
  jobs: {
    list: "/api/jobs",
    categories: "/api/jobs/categories",
    detail: (id: string) => `/api/jobs/${id}`,
    myList: "/api/jobs/me/jobs",
    create: "/api/jobs/me/job",
    update: (jobId: string) => `/api/jobs/me/jobs/${jobId}`,
    delete: (jobId: string) => `/api/jobs/me/jobs/${jobId}`,
    images: "/api/jobs/me/job-images",
    accept: (jobId: string) => `/api/jobs/me/jobs/${jobId}/accept`,
    quotes: "/api/jobs/me/quotes",
    quote: (quoteId: string) => `/api/jobs/me/quotes/${quoteId}`,
    savedJobs: "/api/jobs/me/saved-jobs",
    savedJobIds: "/api/jobs/me/saved-jobs/ids",
    savedJob: (jobId: string) => `/api/jobs/me/saved-jobs/${jobId}`,
    /** Legacy */
    createLegacy: "/api/auth/me/job",
    imagesLegacy: "/api/auth/me/job-images",
    acceptLegacy: (jobId: string) => `/api/auth/me/jobs/${jobId}/accept`,
  },
  services: {
    list: "/api/services",
    categories: "/api/services/categories",
    detail: (id: string) => `/api/services/${id}`,
    myList: "/api/services/me/services",
    myDetail: (id: string) => `/api/services/me/service/${id}`,
    create: "/api/services/me/service",
    update: (id: string) => `/api/services/me/service/${id}`,
    patchStatus: (id: string) => `/api/services/me/service/${id}/status`,
    myReviews: "/api/services/me/reviews",
    replyReview: (id: string) => `/api/services/me/reviews/${id}/reply`,
    images: "/api/services/me/service-images",
    thumbnail: "/api/services/me/service-thumbnail",
    demo: "/api/services/me/service-demo",
    /** Legacy */
    createLegacy: "/api/auth/me/service",
    updateLegacy: (id: string) => `/api/auth/me/service/${id}`,
  },
  payments: {
    billing: "/api/payments/billing",
    billingProfile: "/api/payments/billing-profile",
    billingMethods: "/api/payments/billing-methods",
    billingMethodDefault: (methodId: string) =>
      `/api/payments/billing-methods/${methodId}/default`,
    billingMethod: (methodId: string) => `/api/payments/billing-methods/${methodId}`,
    deposit: "/api/payments/deposit",
    createPaymentLink: "/api/payments/create-payment-link",
    payosWebhook: "/api/payments/payos-webhook",
    depositOrder: (orderCode: string | number) =>
      `/api/payments/deposit-orders/${encodeURIComponent(String(orderCode))}`,
    cancelDepositOrder: (orderCode: string | number) =>
      `/api/payments/deposit-orders/${encodeURIComponent(String(orderCode))}/cancel`,
    withdraw: "/api/payments/withdraw",
    withdrawRequest: "/api/payments/withdraw/request",
    withdrawConfirm: (orderId: string) =>
      `/api/payments/withdraw/${encodeURIComponent(orderId)}/confirm`,
    withdrawStatus: (orderId: string) =>
      `/api/payments/withdraw/${encodeURIComponent(orderId)}/status`,
    withdrawalPin: "/api/payments/withdrawal-pin",
    payosPayoutWebhook: "/api/payments/payos-payout-webhook",
    payoutAccount: "/api/payments/payout-account",
  },
  admin: {
    freelancerApprovals: "/api/admin/freelancer-approvals",
    freelancerApproval: (userId: string) => `/api/admin/freelancer-approvals/${encodeURIComponent(userId)}`,
    approveFreelancer: (userId: string) =>
      `/api/admin/freelancer-approvals/${encodeURIComponent(userId)}/approve`,
    rejectFreelancer: (userId: string) =>
      `/api/admin/freelancer-approvals/${encodeURIComponent(userId)}/reject`,
    disputes: "/api/admin/disputes",
    dispute: (disputeId: string) => `/api/admin/disputes/${encodeURIComponent(disputeId)}`,
    disputeMessages: (disputeId: string) =>
      `/api/admin/disputes/${encodeURIComponent(disputeId)}/messages`,
    resolveDispute: (disputeId: string) =>
      `/api/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
  },
  chat: {
    listConversations: "/api/chat/conversations",
    openConversation: "/api/chat/conversations/open",
    conversation: (conversationId: string) => `/api/chat/conversations/${conversationId}`,
    read: (conversationId: string) => `/api/chat/conversations/${conversationId}/read`,
    block: (conversationId: string) => `/api/chat/conversations/${conversationId}/block`,
    attachments: (conversationId: string) =>
      `/api/chat/conversations/${conversationId}/attachments`,
    messages: (conversationId: string) => `/api/chat/conversations/${conversationId}/messages`,
  },
  notifications: {
    list: "/api/notifications",
    unreadCount: "/api/notifications/unread-count",
    readAll: "/api/notifications/read-all",
    deleteRead: "/api/notifications/read",
    read: (id: string) => `/api/notifications/${id}/read`,
    delete: (id: string) => `/api/notifications/${id}`,
  },
} as const;
