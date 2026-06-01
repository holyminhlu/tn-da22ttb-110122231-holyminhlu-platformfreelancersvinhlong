import ClientHireQuotesPage from "@/components/hire/ClientHireQuotesPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Trích dẫn",
  "Xem báo giá theo từng công việc đã đăng.",
);

export default function HireQuotesPage() {
  return <ClientHireQuotesPage />;
}
