import type { Metadata } from "next";
import ServicesPage from "@/components/services/ServicesPage";

export const metadata: Metadata = {
  title: "Dịch vụ | Vĩnh Long Connected",
  description: "Khám phá các dịch vụ freelance theo danh mục, ngân sách và đánh giá tại Vĩnh Long Connected.",
};

export default function DichVuPage() {
  return <ServicesPage />;
}
