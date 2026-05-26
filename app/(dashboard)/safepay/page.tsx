import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "SafePay",
  "Thanh toán an toàn trên Vĩnh Long Connected.",
);

export default function SafePayPage() {
  return (
    <SitePage
      title="SafePay"
      description="Thông tin SafePay sẽ được bổ sung."
    />
  );
}
