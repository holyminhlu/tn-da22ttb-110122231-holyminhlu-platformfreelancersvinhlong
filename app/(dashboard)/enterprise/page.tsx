import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Enterprise",
  "Giải pháp doanh nghiệp trên Vĩnh Long Connected.",
);

export default function EnterprisePage() {
  return (
    <SitePage
      title="Enterprise"
      description="Giải pháp Enterprise sẽ được bổ sung."
    />
  );
}
