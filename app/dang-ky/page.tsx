import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký | Vĩnh Long Connect",
  description: "Đăng ký Khách hàng hoặc Freelancer và lưu hồ sơ vào hệ thống.",
};

function RegisterFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] text-sm text-gray-500">
      Đang tải…
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
