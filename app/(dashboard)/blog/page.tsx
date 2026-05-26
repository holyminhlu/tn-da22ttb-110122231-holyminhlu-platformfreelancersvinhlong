import SitePage, { sitePageMetadata } from "@/components/layout/SitePage";

export const metadata = sitePageMetadata(
  "Blog",
  "Tin tức và bài viết từ Vĩnh Long Connected.",
);

export default function BlogPage() {
  return (
    <SitePage
      title="Blog"
      description="Danh sách bài viết sẽ được bổ sung."
    />
  );
}
