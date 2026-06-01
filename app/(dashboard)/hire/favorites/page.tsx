import ClientHireFavoritesPage from "@/components/hire/ClientHireFavoritesPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Favorite Freelancers",
  "Thuê, nhắn tin hoặc yêu cầu báo giá từ freelancer yêu thích.",
);

export default function HireFavoritesPage() {
  return <ClientHireFavoritesPage />;
}
