import AdminWithdrawalsPage from "@/components/admin/AdminWithdrawalsPage";

export const metadata = {
  title: "Yêu cầu rút tiền Client — VLC Admin",
  description: "Admin xử lý các yêu cầu rút tiền từ Client.",
};

export default function AdminRutTienClientPage() {
  return <AdminWithdrawalsPage audience="client" />;
}
