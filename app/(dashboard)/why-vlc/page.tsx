import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Why Vĩnh Long Connected",
  "Lý do chọn Vĩnh Long Connected.",
);

export default function WhyVlcPage() {
  return (
    <SitePage
      title="Why Vĩnh Long Connected"
      description="Nội dung lợi ích và điểm khác biệt sẽ được bổ sung."
    />
  );
}
