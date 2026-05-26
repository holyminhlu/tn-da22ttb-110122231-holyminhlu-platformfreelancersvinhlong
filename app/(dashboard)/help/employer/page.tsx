import type { Metadata } from "next";
import HelpCenter from "@/components/help/HelpCenter";

export const metadata: Metadata = {
  title: "Trợ giúp Nhà tuyển dụng — Vĩnh Long Connected",
  description: "Trung tâm trợ giúp dành cho nhà tuyển dụng.",
};

export default function HelpEmployerPage() {
  return <HelpCenter initialRole="employer" />;
}
