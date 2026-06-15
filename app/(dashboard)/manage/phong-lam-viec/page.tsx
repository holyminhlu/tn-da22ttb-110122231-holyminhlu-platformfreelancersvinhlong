import ClientManagePage from "@/components/manage/ClientManagePage";
import { clientPageMetadata } from "@/components/layout/ClientPlaceholderPage";

export const metadata = clientPageMetadata(
  "Phòng làm việc",
  "Phòng làm việc và quản lý công việc của client.",
);

export default function ManageWorkspacePage() {
  return <ClientManagePage />;
}
