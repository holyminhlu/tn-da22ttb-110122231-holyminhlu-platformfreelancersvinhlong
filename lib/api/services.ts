import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";
import type { ServicePackage } from "@/lib/hire/servicePackages";

export type { ServicePackage };

export type ServiceListingStatus = "draft" | "pending" | "active" | "paused" | "denied";

export type MyServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: string | number;
  delivery_days: number | null;
  category: string | null;
  media_urls: unknown;
  packages: unknown;
  tech_stack: unknown;
  requirements: string | null;
  faqs: unknown;
  response_time_hours: number | null;
  support_upsell: string | null;
  demo_media: unknown;
  thumbnail_url: string | null;
  listing_status: ServiceListingStatus;
  admin_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  rating_avg: number | null;
  total_reviews: number;
};

export type CreateServicePayload = {
  title: string;
  description?: string;
  price: number;
  deliveryDays?: number;
  category?: string;
  requirements?: string;
  supportUpsell?: string;
  mediaUrls?: string[];
  thumbnailUrl?: string | null;
  demoMedia?: { url: string; kind: "video" } | null;
  techStack?: string[];
  tags?: string[];
  faqs?: { q: string; a: string }[];
  packages?: ServicePackage[];
  responseTimeHours?: number;
  listingStatus?: ServiceListingStatus;
};

export type ServiceReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  freelancerReply: string | null;
  freelancerReplyAt: string | null;
  contractId: string;
  serviceId: string | null;
  serviceTitle: string | null;
  clientName: string | null;
  clientAvatarUrl: string | null;
};

export type ServiceDetail = {
  id: string;
  title: string;
  description: string | null;
  price: string | number;
  delivery_days: number | null;
  category: string | null;
  packages: unknown;
  requirements: string | null;
  tech_stack: unknown;
  faqs: unknown;
  thumbnail_url: string | null;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_avatar_url: string | null;
  freelancer_title: string | null;
  rating_avg: number;
  total_reviews: number;
};

export async function listMyServices() {
  const { data } = await fetchApi<{ services: MyServiceRow[] }>(apiPaths.services.myList, {
    auth: true,
  });
  return data.services ?? [];
}

export async function getMyService(serviceId: string) {
  const { data } = await fetchApi<{ service: MyServiceRow }>(apiPaths.services.myDetail(serviceId), {
    auth: true,
  });
  return data.service;
}

export async function listServiceCategories() {
  const { data } = await fetchApi<{ categories: { id?: string; name: string }[] }>(
    apiPaths.services.categories,
  );
  return data.categories ?? [];
}

export async function createMyService(payload: CreateServicePayload) {
  const { data } = await fetchApi<{ message: string; service: MyServiceRow }>(
    apiPaths.services.create,
    { method: "POST", auth: true, body: payload },
  );
  return data;
}

export async function updateMyService(serviceId: string, payload: CreateServicePayload) {
  const { data } = await fetchApi<{ message: string; service: MyServiceRow }>(
    apiPaths.services.update(serviceId),
    { method: "PATCH", auth: true, body: payload },
  );
  return data;
}

export async function patchMyServiceStatus(serviceId: string, status: ServiceListingStatus) {
  const { data } = await fetchApi<{ message: string; service: MyServiceRow }>(
    apiPaths.services.patchStatus(serviceId),
    { method: "PATCH", auth: true, body: { status } },
  );
  return data;
}

export async function uploadServiceImages(files: File[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("images", file);
  }
  const { data } = await fetchApi<{ urls: string[] }>(apiPaths.services.images, {
    method: "POST",
    auth: true,
    body: form,
  });
  return data.urls ?? [];
}

export async function uploadServiceThumbnail(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await fetchApi<{ url: string }>(apiPaths.services.thumbnail, {
    method: "POST",
    auth: true,
    body: form,
  });
  return data.url;
}

export async function uploadServiceDemo(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await fetchApi<{ url: string; demoMedia?: { url: string; kind: string } }>(
    apiPaths.services.demo,
    { method: "POST", auth: true, body: form },
  );
  return data;
}

export async function listMyServiceReviews() {
  const { data } = await fetchApi<{ reviews: ServiceReviewRow[] }>(apiPaths.services.myReviews, {
    auth: true,
  });
  return data.reviews ?? [];
}

export async function replyServiceReview(reviewId: string, reply: string) {
  const { data } = await fetchApi<{ message: string }>(apiPaths.services.replyReview(reviewId), {
    method: "PATCH",
    auth: true,
    body: { reply },
  });
  return data;
}

export async function getService(serviceId: string) {
  const { data } = await fetchApi<{
    service: ServiceDetail;
    reviews: { id: string; rating: number; comment: string | null; created_at: string; client_name: string | null }[];
  }>(apiPaths.services.detail(serviceId));
  return data;
}
