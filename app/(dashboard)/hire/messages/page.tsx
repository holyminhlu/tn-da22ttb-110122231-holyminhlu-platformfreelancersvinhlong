import ClientHireMessagesPage from "@/components/hire/ClientHireMessagesPage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Tin nhắn",
  "Trao đổi với freelancer — việc liên quan và nội dung chat.",
);

export default function HireMessagesRoutePage() {
  return <ClientHireMessagesPage />;
}
