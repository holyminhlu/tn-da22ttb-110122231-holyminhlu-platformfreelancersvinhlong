import AdminWithdrawalsPage from "@/components/admin/AdminWithdrawalsPage";

export const metadata = {
  title: "Yêu cầu rút tiền Khách hàng — VLC Admin",
  description: "Admin xử lý các yêu cầu rút tiền từ Khách hàng.",
};

export default function AdminRutTienClientPage() {
  return <AdminWithdrawalsPage audience="client" />;
}
