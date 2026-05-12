import type { Metadata } from "next";
import FreelancersPage from "@/components/freelancer/FreelancersPage";

export const metadata: Metadata = {
  title: "Freelancer | Vĩnh Long Connected",
  description: "Khám phá freelancer theo kỹ năng, khu vực và đánh giá trên Vĩnh Long Connected.",
};

export default function FreelancerPage() {
  return <FreelancersPage />;
}
