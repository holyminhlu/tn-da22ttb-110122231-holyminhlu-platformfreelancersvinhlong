import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "How VLC Works",
  "Cách thức hoạt động của Vĩnh Long Connected.",
);

export default function HowVlcWorksPage() {
  return (
    <SitePage
      title="How VLC Works"
      description="Hướng dẫn quy trình sử dụng nền tảng sẽ được bổ sung."
    />
  );
}
