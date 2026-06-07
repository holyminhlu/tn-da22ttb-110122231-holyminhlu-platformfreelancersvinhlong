"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isClientRole, isFreelancerRole } from "@/hooks/useStoredUser";
import type { AuthUser } from "@/lib/api/auth";
import { persistAuthTokens, persistStoredUser, toStoredUser } from "@/lib/authSession";

function safeNextPath(raw: string | null): string | null {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function parseUserPayload(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as AuthUser;
    if (!parsed?.id || !parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

export default function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Đang hoàn tất đăng nhập Google…");

  useEffect(() => {
    const hashParams = readHashParams();
    const error =
      searchParams.get("error") ||
      hashParams.get("error") ||
      searchParams.get("message");

    if (error) {
      setMessage(decodeURIComponent(error));
      return;
    }

    const accessToken =
      hashParams.get("accessToken") || searchParams.get("accessToken");
    const refreshToken =
      hashParams.get("refreshToken") || searchParams.get("refreshToken");
    const userRaw = hashParams.get("user") || searchParams.get("user");
    const nextRaw = hashParams.get("next") || searchParams.get("next");
    const user = parseUserPayload(userRaw);

    if (!accessToken || !refreshToken || !user) {
      setMessage("Thiếu thông tin phiên đăng nhập từ Google. Vui lòng thử lại.");
      return;
    }

    persistAuthTokens({ accessToken, refreshToken });
    persistStoredUser(toStoredUser(user));

    const nextPath = safeNextPath(nextRaw);
    const destination =
      nextPath ??
      (isFreelancerRole(user.role) || isClientRole(user.role) ? "/dashboard" : "/");

    setMessage("Đăng nhập thành công. Đang chuyển hướng…");
    router.replace(destination);
    router.refresh();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f7f9] px-4 text-center">
      <p className="text-sm text-gray-700" role="status">
        {message}
      </p>
      {message.includes("thử lại") || message.includes("Thiếu") ? (
        <a
          href="/dang-nhap"
          className="text-sm font-semibold text-[#0066cc] hover:underline"
        >
          Quay lại đăng nhập
        </a>
      ) : null}
    </div>
  );
}
