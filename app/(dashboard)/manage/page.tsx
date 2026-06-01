import ClientManagePage from "@/components/manage/ClientManagePage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Quản lý",
  "Phòng làm việc và quản lý công việc của client.",
);

export default function ManagePage() {
  return <ClientManagePage />;
}
