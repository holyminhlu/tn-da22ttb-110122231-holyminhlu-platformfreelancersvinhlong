import type { Metadata } from "next";
import UserProfilePage from "@/components/profile/UserProfilePage";

export const metadata: Metadata = {
  title: "Hồ sơ người dùng | Vĩnh Long Connected",
  description: "Thông tin hồ sơ cá nhân cho Client và Freelancer.",
};

export default function ProfilePage() {
  return <UserProfilePage />;
}
