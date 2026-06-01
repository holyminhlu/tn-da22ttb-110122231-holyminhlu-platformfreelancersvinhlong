import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";
import { fetchApi } from "./client";

export type IdentityVerificationRecord = {
  user_id: string;
  account_type: "personal" | "company";
  use_existing_account_info: boolean;
  legal_first_name: string | null;
  legal_last_name: string | null;
  address_search: string | null;
  address_street: string | null;
  address_country: string | null;
  address_state: string | null;
  address_city: string | null;
  address_postal: string | null;
  address_lat: number | null;
  address_lng: number | null;
  contact_confirmed: boolean;
  contact_confirmed_at: string | null;
  selfie_url: string | null;
  id_doc_type: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  address_proof_type: string | null;
  address_proof_url: string | null;
  phone_submitted_at: string | null;
  photo_submitted_at: string | null;
  id_submitted_at: string | null;
  address_proof_submitted_at: string | null;
  submitted_for_review_at: string | null;
  card_last4: string | null;
  card_brand: string | null;
  card_expiry: string | null;
  cardholder_name: string | null;
  is_business_card: boolean;
  billing_street: string | null;
  billing_country: string | null;
  billing_state: string | null;
  billing_city: string | null;
  billing_postal: string | null;
  billing_phone: string | null;
  billing_currency: string | null;
  card_charge_cents: number | null;
  card_added_at: string | null;
  card_verified_at: string | null;
};

export type AddCreditCardPayload = {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
  isBusinessCard?: boolean;
  billingStreet: string;
  billingCountry: string;
  billingState?: string;
  billingCity: string;
  billingPostal?: string;
  billingPhone?: string;
  billingCurrency?: string;
};

export type IdentityVerificationProfile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  district_city: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
};

export type IdentityVerificationResponse = {
  verification: IdentityVerificationRecord | null;
  profile: IdentityVerificationProfile;
};

export type PatchIdentityPayload = {
  accountType?: "personal" | "company";
  useExistingAccountInfo?: boolean;
  legalFirstName?: string;
  legalLastName?: string;
  addressSearch?: string;
  addressStreet?: string;
  addressCountry?: string;
  addressState?: string;
  addressCity?: string;
  addressPostal?: string;
  addressLat?: number | null;
  addressLng?: number | null;
  contactConfirmed?: boolean;
  syncProfile?: boolean;
  phone?: string;
  idDocType?: string;
  addressProofType?: string;
  submitForReview?: boolean;
};

export function resolveIdentityAssetUrl(url?: string | null): string | undefined {
  const trimmed = String(url || "").trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return apiUrl(path, getApiBaseUrl());
}

export async function getIdentityVerification() {
  const { data } = await fetchApi<IdentityVerificationResponse>(apiPaths.users.identityVerification, {
    auth: true,
  });
  return data;
}

export async function patchIdentityVerification(payload: PatchIdentityPayload) {
  const { data } = await fetchApi<{ message?: string; verification: IdentityVerificationRecord }>(
    apiPaths.users.identityVerification,
    { method: "PATCH", auth: true, body: payload },
  );
  return data;
}

export async function addCreditCard(payload: AddCreditCardPayload) {
  const { data } = await fetchApi<{
    message?: string;
    chargeAmountUsd?: string;
    verification: IdentityVerificationRecord;
  }>(apiPaths.users.identityCard, {
    method: "POST",
    auth: true,
    body: payload,
  });
  return data;
}

export async function verifyCardCharge(chargeAmount: number | string) {
  const { data } = await fetchApi<{
    message?: string;
    verification: IdentityVerificationRecord;
  }>(apiPaths.users.identityCardVerifyCharge, {
    method: "POST",
    auth: true,
    body: { chargeAmount },
  });
  return data;
}

export async function uploadIdentityFile(
  endpoint: string,
  file: File,
): Promise<{ url: string; message?: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await fetchApi<{ url: string; message?: string }>(endpoint, {
    method: "POST",
    auth: true,
    body: form,
  });
  return data;
}
