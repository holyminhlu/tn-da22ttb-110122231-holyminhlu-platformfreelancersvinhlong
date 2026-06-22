import ManageServiceDetailPage from "@/components/services/ManageServiceDetailPage";

type PageProps = {
  params: Promise<{ serviceId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { serviceId } = await params;
  return {
    title: `Chi tiết dịch vụ — Vĩnh Long Connect`,
    description: `Quản lý gig ${serviceId}`,
  };
}

export default function DichVuManageDetailPage() {
  return <ManageServiceDetailPage />;
}
