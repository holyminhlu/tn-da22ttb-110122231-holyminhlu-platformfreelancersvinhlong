import type { Metadata } from "next";
import { Suspense } from "react";
import DangNhapEntry from "@/components/auth/DangNhapEntry";

export const metadata: Metadata = {
  title: "Đăng nhập | Vĩnh Long Connected",
  description: "Đăng nhập bằng email/password hoặc tiếp tục với Google.",
};

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] text-sm text-gray-500">
      Đang tải…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <DangNhapEntry />
    </Suspense>
  );
}
