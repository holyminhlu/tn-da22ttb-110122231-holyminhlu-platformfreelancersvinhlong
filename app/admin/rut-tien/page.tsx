import AdminWithdrawalsPage from "@/components/admin/AdminWithdrawalsPage";

export const metadata = {
  title: "Yêu cầu rút tiền — VLC Admin",
  description: "Admin xử lý các yêu cầu rút tiền từ Freelancer.",
};

export default function AdminRutTienPage() {
  return <AdminWithdrawalsPage audience="freelancer" />;
}

