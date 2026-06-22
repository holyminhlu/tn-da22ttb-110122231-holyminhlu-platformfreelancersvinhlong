import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Agreements",
  "Hợp đồng và thỏa thuận làm việc trên Vĩnh Long Connect.",
);

export default function AgreementsPage() {
  return (
    <SitePage
      title="Agreements"
      description="Nội dung Work Agreements sẽ được bổ sung."
    />
  );
}
