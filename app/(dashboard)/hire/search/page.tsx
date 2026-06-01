import ClientHireSearchPage from "@/components/hire/ClientHireSearchPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Tìm kiếm freelancer",
  "Tìm, lọc và thuê freelancer theo kỹ năng, danh mục và địa điểm.",
);

export default function HireSearchPage() {
  return <ClientHireSearchPage />;
}
