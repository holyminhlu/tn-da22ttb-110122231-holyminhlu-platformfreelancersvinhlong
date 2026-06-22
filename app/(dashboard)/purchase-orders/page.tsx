import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Purchase Orders",
  "Quản lý đơn mua hàng (PO) trên Vĩnh Long Connect.",
);

export default function PurchaseOrdersPage() {
  return (
    <SitePage
      title="Purchase Orders"
      description="Giải pháp Purchase Orders sẽ được bổ sung."
    />
  );
}
