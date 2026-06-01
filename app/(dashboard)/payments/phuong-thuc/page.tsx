import ClientPlaceholderPage, { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Phương thức thanh toán",
  "Quản lý phương thức thanh toán của client.",
);

export default function PaymentMethodsPage() {
  return (
    <ClientPlaceholderPage
      title="Phương thức thanh toán"
      description="Thêm và quản lý phương thức thanh toán — đang phát triển."
    />
  );
}
