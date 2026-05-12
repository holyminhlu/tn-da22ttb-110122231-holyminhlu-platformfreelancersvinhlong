import type { Metadata } from "next";
import ServiceDetailPage from "@/components/services/ServiceDetailPage";

export const metadata: Metadata = {
  title: "Chi tiết dịch vụ | Vĩnh Long Connected",
  description: "Xem thông tin chi tiết dịch vụ freelance, gói giá và hồ sơ freelancer.",
};

export default async function DichVuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceDetailPage serviceId={id} />;
}
