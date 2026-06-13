import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type BillingMethodType = "card" | "paypal" | "bank";
export type TransactionCategory =
  | "milestone"
  | "deposit"
  | "withdraw"
  | "processing_fee"
  | "refund"
  | "escrow_hold"
  | "escrow_release"
  | "other";

export type BillingMethod = {
  id: string;
  type: BillingMethodType;
  label: string;
  detail: string;
  isPrimary: boolean;
  isAutoBillingEnabled: boolean;
  autoTopupThreshold: number | null;
  autoTopupAmount: number | null;
};

export type BillingProfile = {
  companyName: string;
  companyAddress: string;
  taxId: string;
  billingEmail: string;
  contactName: string;
};

export type BillingTransaction = {
  id: string;
  occurredAt: string;
  projectTitle: string;
  freelancerName: string;
  category: string;
  amount: number;
  currency: string;
  invoiceNumber: string | null;
  jobId: string | null;
  freelancerId: string | null;
};

export type BillingOverview = {
  account: {
    balance: number;
    escrowBalance: number;
    currency: string;
  };
  billingProfile: BillingProfile;
  billingMethods: BillingMethod[];
  defaultMethod: BillingMethod | null;
  transactions: BillingTransaction[];
  filterOptions: {
    jobs: { id: string; title: string }[];
    freelancers: { id: string; name: string }[];
  };
};

export type UpdateBillingProfilePayload = BillingProfile;

export type FreelancerPayoutProfile = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  bankName: string;
  accountLast4: string;
  isConfigured: boolean;
};

export type FreelancerPendingEarning = {
  contractId: string;
  amount: number;
  fundedAt: string | null;
  workflowStage: string | null;
  escrowStatus: string | null;
  projectTitle: string;
  clientName: string;
};

export type FreelancerTransaction = {
  id: string;
  occurredAt: string;
  projectTitle: string;
  clientName: string;
  category: string;
  amount: number;
  currency: string;
  reference: string | null;
  jobId: string | null;
  clientId: string | null;
  contractId: string | null;
};

export type FreelancerBillingOverview = {
  role: "freelancer";
  account: {
    balance: number;
    currency: string;
    pendingBalance: number;
    totalEarned: number;
  };
  payoutProfile: FreelancerPayoutProfile;
  pendingItems: FreelancerPendingEarning[];
  transactions: FreelancerTransaction[];
  filterOptions: {
    jobs: { id: string; title: string }[];
    clients: { id: string; name: string }[];
  };
  platformFeeNote: string;
};

export async function getBillingOverview() {
  const { data } = await fetchApi<BillingOverview>(apiPaths.payments.billing, { auth: true });
  return data;
}

export async function getClientBillingOverview() {
  const data = await getBillingOverview();
  if ("billingProfile" in data) return data;
  throw { status: 403, message: "Chỉ client được truy cập trang thanh toán này." };
}

export async function getFreelancerBillingOverview() {
  const { data } = await fetchApi<FreelancerBillingOverview>(apiPaths.payments.billing, {
    auth: true,
  });
  if (data.role !== "freelancer") {
    throw { status: 403, message: "Chỉ freelancer được truy cập trang thanh toán này." };
  }
  return data;
}

export async function updateBillingProfile(payload: UpdateBillingProfilePayload) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.payments.billingProfile, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
  return data;
}

export type AddBillingMethodPayload = {
  variant: "intl_card" | "domestic_atm" | "ewallet";
  cardNumber: string;
  cardholderName?: string;
  expMonth?: number;
  expYear?: number;
  bankName?: string;
  walletProvider?: "momo" | "zalopay";
  walletPhone?: string;
  isDefault: boolean;
};

export async function addBillingMethod(payload: AddBillingMethodPayload) {
  const { data } = await fetchApi<{ message: string; method: BillingMethod }>(
    apiPaths.payments.billingMethods,
    {
      method: "POST",
      auth: true,
      body: payload,
    },
  );
  return data;
}

export async function setDefaultBillingMethod(methodId: string) {
  const { data } = await fetchApi<{ message: string; method: BillingMethod }>(
    apiPaths.payments.billingMethodDefault(methodId),
    {
      method: "PATCH",
      auth: true,
    },
  );
  return data;
}

export async function deleteBillingMethod(methodId: string) {
  const { data } = await fetchApi<{ message: string }>(
    apiPaths.payments.billingMethod(methodId),
    {
      method: "DELETE",
      auth: true,
    },
  );
  return data;
}

export async function depositFunds(amount: number) {
  const { data } = await fetchApi<{ message: string; account: BillingOverview["account"] }>(
    apiPaths.payments.deposit,
    {
      method: "POST",
      auth: true,
      body: { amount },
    },
  );
  return data;
}

export function transactionCategoryLabel(category: string) {
  switch (category) {
    case "milestone":
      return "Thanh toán milestone";
    case "deposit":
      return "Nạp tiền vào ví";
    case "withdraw":
      return "Rút tiền / Hoàn tiền";
    case "processing_fee":
      return "Phí nền tảng";
    case "escrow_hold":
      return "Nạp ký quỹ (Escrow)";
    case "escrow_release":
      return "Giải ngân ký quỹ";
    case "refund":
      return "Hoàn tiền";
    default:
      return category || "—";
  }
}

export async function withdrawFreelancerFunds(amount: number) {
  const { data } = await fetchApi<{
    message: string;
    account: FreelancerBillingOverview["account"];
  }>(apiPaths.payments.withdraw, {
    method: "POST",
    auth: true,
    body: { amount },
  });
  return data;
}

export function freelancerTransactionCategoryLabel(category: string) {
  switch (category) {
    case "escrow_release":
    case "milestone":
      return "Thu nhập giải ngân";
    case "withdraw":
      return "Rút tiền";
    case "processing_fee":
      return "Phí nền tảng";
    case "refund":
      return "Hoàn / điều chỉnh";
    case "deposit":
      return "Nạp tiền";
    default:
      return transactionCategoryLabel(category);
  }
}

export function billingMethodTypeLabel(type: BillingMethodType) {
  switch (type) {
    case "card":
      return "Thẻ tín dụng/ghi nợ";
    case "paypal":
      return "PayPal";
    case "bank":
      return "Tài khoản ngân hàng";
    default:
      return type;
  }
}
