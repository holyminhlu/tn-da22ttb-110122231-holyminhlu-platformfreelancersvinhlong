import type { Metadata } from "next";
import MyWorkPage from "@/components/my-work/MyWorkPage";

export const metadata: Metadata = {
  title: "Công việc của tôi | Vĩnh Long Connected",
  description: "Workspace Client và Freelancer: tiến độ, bàn giao và chi tiết hợp đồng.",
};

export default function CongViecCuaToiPage() {
  return <MyWorkPage />;
}
