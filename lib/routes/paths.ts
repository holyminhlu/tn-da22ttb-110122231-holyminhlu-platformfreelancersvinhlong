/**
 * Single source of truth for app routes.
 *
 * Conventions:
 * - Client (nhà tuyển dụng): /hire/*, /manage/*
 * - Freelancer: /findwork/* (tìm việc), /dich-vu/* (dịch vụ & đơn hàng), /jobs (hợp đồng việc)
 * - Hồ sơ xem/sửa: /ho-so/* | Cài đặt tài khoản: /edit-account/*
 */

export const ROUTES = {
  home: "/",
  login: "/dang-nhap",
  register: "/dang-ky",
  dashboard: "/dashboard",

  admin: {
    home: "/admin/duyet-tai-khoan",
    approvals: "/admin/duyet-tai-khoan",
    refunds: "/admin/hoan-tien",
    withdrawals: "/admin/rut-tien",
    clientWithdrawals: "/admin/rut-tien-client",
    disputes: "/admin/tranh-chap",
  },

  profile: {
    view: "/ho-so",
    stats: "/ho-so/thong-ke",
    feedback: "/ho-so/phan-hoi",
  },

  account: {
    contact: "/edit-account",
    verify: "/edit-account/xac-minh",
    credentials: "/edit-account/ten-dang-nhap",
    security: "/edit-account/bao-mat",
    settings: "/edit-account/cai-dat",
  },

  payments: {
    hub: "/payments",
    methods: "/payments/phuong-thuc",
    success: "/payments/success",
    cancel: "/payments/cancel",
  },

  /** Client — thuê freelancer & quản lý đơn dịch vụ */
  hire: {
    quotes: "/hire/quotes",
    quoteRequest: "/hire/quote",
    messages: "/hire/messages",
    serviceOrders: "/hire/orders",
    favorites: "/hire/favorites",
    search: "/hire/search",
    jobList: "/hire/joblist",
    postJob: "/hire/post",
  },

  /** Client — phòng làm việc, hoàn tiền, tranh chấp */
  manage: {
    workspace: "/manage/phong-lam-viec",
    refunds: "/manage/hoan-tien",
    disputes: "/manage/tranh-chap",
  },

  /** Freelancer — tìm việc làm (job-based) */
  findwork: {
    browse: "/findwork",
    saved: "/findwork/saved",
    messages: "/findwork/messages",
    leads: "/findwork/leads",
    quotes: "/findwork/quotes",
    jobContracts: "/jobs",
  },

  /** Freelancer — dịch vụ & đơn hàng dịch vụ */
  services: {
    hub: "/dich-vu/quan-ly",
    create: "/dich-vu/tao-moi",
    manage: "/dich-vu/quan-ly",
    orders: "/dich-vu/don-hang",
    refunds: "/dich-vu/hoan-tien",
    disputes: "/dich-vu/tranh-chap",
    reviews: "/dich-vu/danh-gia",
  },

  /** Công khai — xem freelancer */
  freelancers: {
    list: "/freelancers",
  },

  /** Chi tiết tin việc (job posting) */
  work: {
    detail: "/work/detail",
  },
} as const;

/** Prefixes that require a logged-in user (non-admin) route guard. */
export const USER_ONLY_PREFIXES = [
  ROUTES.dashboard,
  "/findwork",
  "/hire",
  ROUTES.payments.hub,
  "/manage",
  "/dich-vu",
  ROUTES.account.contact,
  ROUTES.profile.view,
  ROUTES.findwork.jobContracts,
  ROUTES.work.detail,
] as const;

export const ADMIN_HOME = ROUTES.admin.home;

export function serviceOrderHref(
  contractId: string,
  role: "client" | "freelancer",
): string {
  return role === "client"
    ? `${ROUTES.hire.serviceOrders}/${contractId}`
    : `${ROUTES.services.orders}/${contractId}`;
}

/** @deprecated Use serviceOrderHref(id, "freelancer") */
export function freelancerServiceOrderHref(contractId: string): string {
  return serviceOrderHref(contractId, "freelancer");
}

export function clientServiceOrderHref(contractId: string): string {
  return serviceOrderHref(contractId, "client");
}

export function jobDetailHref(jobId: string): string {
  return `${ROUTES.work.detail}/${jobId}`;
}

export function jobListDetailHref(jobId: string): string {
  return `${ROUTES.hire.jobList}/${jobId}`;
}

export function hireQuoteDetailHref(quoteId: string): string {
  return `${ROUTES.hire.quotes}/${quoteId}`;
}

export function freelancerProfileHref(
  freelancerId: string,
  opts?: { publicBrowse?: boolean },
): string {
  return opts?.publicBrowse
    ? `${ROUTES.freelancers.list}/${freelancerId}`
    : `${ROUTES.hire.search}/${freelancerId}`;
}

export function serviceManageHref(serviceId: string): string {
  return `${ROUTES.services.manage}/${serviceId}`;
}

export function serviceEditHref(serviceId: string): string {
  return `${ROUTES.services.manage}/${serviceId}/chinh-sua`;
}

export function jobContractHref(
  item: { id: string; jobId: string },
  role: "client" | "freelancer" = "freelancer",
): string {
  if (item.id && item.id !== item.jobId) {
    return serviceOrderHref(item.id, role);
  }
  return role === "client"
    ? jobListDetailHref(item.jobId)
    : jobDetailHref(item.jobId);
}

export function isUserOnlyPath(pathname: string): boolean {
  return USER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
