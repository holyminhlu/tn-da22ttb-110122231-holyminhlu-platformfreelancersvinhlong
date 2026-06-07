import type { Metadata } from "next";
import FindFreelancersPage from "@/components/freelancers/FindFreelancersPage";

export const metadata: Metadata = {
  title: "Tìm Freelancer — Vĩnh Long Connected",
  description:
    "Khám phá và tìm freelancer chuyên nghiệp tại Vĩnh Long. Xem hồ sơ, dịch vụ và portfolio trước khi đăng nhập để thuê.",
};

export default function FreelancersRoutePage() {
  return <FindFreelancersPage />;
}
