import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type ServicePackage = {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  features: string[];
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

export type ServiceDetailResponse = {
  service: ServiceDetail;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    client_name: string | null;
  }[];
};

export async function getService(serviceId: string) {
  const { data } = await fetchApi<ServiceDetailResponse>(apiPaths.services.detail(serviceId));
  return data;
}
