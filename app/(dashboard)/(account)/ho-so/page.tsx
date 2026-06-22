import type { Metadata } from "next";
import { Suspense } from "react";
import ProfilePageContent from "@/components/profile/ProfilePageContent";
import "@/components/profile/my-profile.css";
import "@/components/profile/client-profile.css";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi — Vĩnh Long Connect",
  description:
    "Quản lý hồ sơ Khách hàng hoặc Freelancer — thông tin cá nhân, giới thiệu và hoạt động trên nền tảng.",
};

export default function HoSoPage() {
  return (
    <Suspense fallback={<p className="ea-loading px-4 py-12">Đang tải hồ sơ...</p>}>
      <ProfilePageContent />
    </Suspense>
  );
}
