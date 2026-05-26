import type { Metadata } from "next";
import FindFreelancersPage from "@/components/freelancers/FindFreelancersPage";

export const metadata: Metadata = {
  title: "Find Freelancers — Vĩnh Long Connected",
  description:
    "Tìm và thuê freelancer chuyên nghiệp. Lọc theo kỹ năng, vị trí và danh mục dịch vụ.",
};

export default function FreelancersRoutePage() {
  return <FindFreelancersPage />;
}
