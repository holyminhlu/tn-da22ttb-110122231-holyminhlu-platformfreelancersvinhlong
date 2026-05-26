import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "About Vĩnh Long Connected",
  "Giới thiệu nền tảng kết nối dịch vụ và freelancer tại Vĩnh Long.",
);

export default function AboutPage() {
  return (
    <SitePage
      title="About Vĩnh Long Connected"
      description="Nội dung giới thiệu sẽ được bổ sung."
    />
  );
}
