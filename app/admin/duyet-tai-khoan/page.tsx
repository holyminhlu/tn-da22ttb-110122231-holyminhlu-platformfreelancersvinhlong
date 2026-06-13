import type { Metadata } from "next";
import FreelancerApprovalPage from "@/components/admin/FreelancerApprovalPage";

export const metadata: Metadata = {
  title: "Duyệt tài khoản | VLC Admin",
  robots: "noindex",
};

export default function AdminFreelancerApprovalRoute() {
  return <FreelancerApprovalPage />;
}
