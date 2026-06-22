import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type ContactSocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SiteContact = {
  email: string;
  phone: string;
  address: string;
  updatedAt?: string | null;
  socialLinks: ContactSocialLink[];
};

export async function getPublicContact(): Promise<SiteContact> {
  const { data } = await fetchApi<SiteContact>(apiPaths.contact.public);
  return data;
}

export async function getAdminContact(): Promise<SiteContact> {
  const { data } = await fetchApi<SiteContact>(apiPaths.admin.contact, { auth: true });
  return data;
}

export async function updateAdminContact(payload: {
  email: string;
  phone: string;
  address: string;
}) {
  const { data } = await fetchApi<{ message: string; email: string; phone: string; address: string }>(
    apiPaths.admin.contact,
    { method: "PATCH", auth: true, body: payload },
  );
  return data;
}

export async function createContactSocialLink(payload: {
  platform: string;
  label: string;
  url?: string;
  sortOrder?: number;
  isVisible?: boolean;
}) {
  const { data } = await fetchApi<{ message: string; item: ContactSocialLink }>(
    apiPaths.admin.contactSocialLinks,
    { method: "POST", auth: true, body: payload },
  );
  return data;
}

export async function updateContactSocialLink(
  linkId: string,
  payload: Partial<{
    platform: string;
    label: string;
    url: string;
    sortOrder: number;
    isVisible: boolean;
  }>,
) {
  const { data } = await fetchApi<{ message: string; item: ContactSocialLink }>(
    apiPaths.admin.contactSocialLink(linkId),
    { method: "PATCH", auth: true, body: payload },
  );
  return data;
}

export async function deleteContactSocialLink(linkId: string) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.admin.contactSocialLink(linkId), {
    method: "DELETE",
    auth: true,
  });
  return data;
}
