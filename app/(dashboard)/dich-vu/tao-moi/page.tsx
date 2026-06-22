import ServiceCreateWizard from "@/components/services/ServiceCreateWizard";

export const metadata = {
  title: "Đăng dịch vụ mới — Vĩnh Long Connect",
  description: "Tạo gig dịch vụ từng bước cho freelancer.",
};

export default function DichVuCreatePage() {
  return <ServiceCreateWizard />;
}
