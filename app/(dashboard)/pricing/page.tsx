import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Pricing",
  "Bảng giá và phí dịch vụ Vĩnh Long Connected.",
);

export default function PricingPage() {
  return (
    <SitePage
      title="Pricing"
      description="Bảng giá chi tiết sẽ được bổ sung."
    />
  );
}
