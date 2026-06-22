import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Agency",
  "Giải pháp cho agency trên Vĩnh Long Connect.",
);

export default function AgencyPage() {
  return (
    <SitePage
      title="Agency"
      description="Giải pháp Agency sẽ được bổ sung."
    />
  );
}
