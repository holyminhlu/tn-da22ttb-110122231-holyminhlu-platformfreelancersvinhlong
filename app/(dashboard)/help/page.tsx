import type { Metadata } from "next";
import HelpPage from "@/components/help/HelpPage";

export const metadata: Metadata = {
  title: "Trợ giúp — Vĩnh Long Connected",
  description: "Trung tâm trợ giúp — chọn loại tài khoản và tìm câu trả lời nhanh.",
};

export default function HelpRoutePage() {
  return <HelpPage />;
}
