import type { BillingProfile } from "@/lib/api/payments";

export type BillingProfileField = keyof BillingProfile;
export type BillingProfileErrors = Partial<Record<BillingProfileField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBillingProfile(form: BillingProfile): BillingProfileErrors {
  const errors: BillingProfileErrors = {};
  const companyName = form.companyName.trim();
  const taxId = form.taxId.trim();
  const companyAddress = form.companyAddress.trim();
  const billingEmail = form.billingEmail.trim();

  if (!companyName) {
    errors.companyName = "Vui lòng nhập tên công ty.";
  } else if (companyName.length < 2) {
    errors.companyName = "Tên công ty phải có ít nhất 2 ký tự.";
  }

  if (!taxId) {
    errors.taxId = "Vui lòng nhập mã số thuế.";
  } else if (!/^\d{10,13}$/.test(taxId)) {
    errors.taxId = "Mã số thuế phải gồm 10–13 chữ số.";
  }

  if (!companyAddress) {
    errors.companyAddress = "Vui lòng nhập địa chỉ công ty.";
  } else if (companyAddress.length < 5) {
    errors.companyAddress = "Địa chỉ công ty quá ngắn.";
  }

  if (billingEmail && !EMAIL_RE.test(billingEmail)) {
    errors.billingEmail = "Email không hợp lệ.";
  }

  return errors;
}
