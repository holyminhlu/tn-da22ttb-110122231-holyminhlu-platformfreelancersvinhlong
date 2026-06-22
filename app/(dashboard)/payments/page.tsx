import PaymentsRouter from "@/components/payments/PaymentsRouter";

export const metadata = {
  title: "Thanh toán — Vĩnh Long Connect",
  description: "Số dư, thu nhập, rút tiền và lịch sử giao dịch.",
};

export default function PaymentsPage() {
  return <PaymentsRouter />;
}
