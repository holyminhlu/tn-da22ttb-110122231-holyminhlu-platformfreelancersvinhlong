import FreelancerPlaceholderPage, {
  freelancerPageMetadata,
} from "@/components/layout/FreelancerPlaceholderPage";

export const metadata = freelancerPageMetadata(
  "Payments",
  "Ví, giao dịch và rút tiền.",
);

export default function PaymentsPage() {
  return (
    <FreelancerPlaceholderPage
      title="Payments"
      description="Thanh toán và số dư tài khoản — sẽ kết nối accounts / transactions sau."
    />
  );
}
