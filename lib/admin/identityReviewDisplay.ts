import type { FreelancerApprovalItem } from "@/lib/api/admin";

const ID_DOC_LABELS: Record<string, string> = {
  drivers_license: "Giấy phép lái xe",
  passport: "Hộ chiếu",
  state_id: "ID tiểu bang",
  national_id: "Chứng minh thư / CCCD",
};

const ADDRESS_PROOF_LABELS: Record<string, string> = {
  utility_bill: "Hóa đơn tiền điện",
  lease: "Hợp đồng thuê nhà",
  insurance: "Thẻ bảo hiểm",
  voter_id: "Thẻ đăng ký cử tri",
};

export function idDocTypeLabel(value: string | null | undefined) {
  if (!value) return "—";
  return ID_DOC_LABELS[value] || value;
}

export function addressProofTypeLabel(value: string | null | undefined) {
  if (!value) return "—";
  return ADDRESS_PROOF_LABELS[value] || value;
}

export function accountTypeLabel(value: string | null | undefined) {
  return value === "company" ? "Doanh nghiệp" : "Cá nhân";
}

export function formatSubmittedAddress(item: FreelancerApprovalItem) {
  const parts = [
    item.addressStreet,
    item.addressCity,
    item.addressState,
    item.addressPostal,
    item.addressCountry,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  return item.addressSearch || "—";
}

export function formatBillingAddress(item: FreelancerApprovalItem) {
  const parts = [
    item.billingStreet,
    item.billingCity,
    item.billingState,
    item.billingPostal,
    item.billingCountry,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
