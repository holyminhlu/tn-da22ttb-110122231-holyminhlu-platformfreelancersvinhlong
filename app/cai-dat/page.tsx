import type { Metadata } from "next";
import SettingsPage from "@/components/settings/SettingsPage";

export const metadata: Metadata = {
  title: "Cài đặt | Vĩnh Long Connected",
  description: "Cài đặt tài khoản, thông báo, riêng tư và chuyên môn trên Vĩnh Long Connected.",
};

export default function CaiDatPage() {
  return <SettingsPage />;
}
