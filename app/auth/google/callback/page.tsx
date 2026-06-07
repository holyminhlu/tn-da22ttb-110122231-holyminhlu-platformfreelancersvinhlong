import type { Metadata } from "next";
import { Suspense } from "react";
import GoogleCallbackHandler from "@/components/auth/GoogleCallbackHandler";

export const metadata: Metadata = {
  title: "Đăng nhập Google | Vĩnh Long Connected",
  robots: "noindex",
};

function CallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] text-sm text-gray-600">
      Đang hoàn tất đăng nhập Google…
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
