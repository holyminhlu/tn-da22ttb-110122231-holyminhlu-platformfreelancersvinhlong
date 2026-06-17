"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useStoredUser } from "@/hooks/useStoredUser";

type PostJobButtonProps = {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

export default function PostJobButton({ className, children, ariaLabel }: PostJobButtonProps) {
  const router = useRouter();
  const { user, ready, isClient } = useStoredUser({ refreshFromApi: false });

  function handleClick() {
    if (!ready) return;

    if (!user) {
      router.push("/dang-nhap?next=%2Fhire%2Fpost");
      return;
    }

    if (isClient) {
      router.push("/hire/post");
      return;
    }

    window.alert("Chức năng Đăng việc dành cho tài khoản Client. Vui lòng đăng nhập bằng tài khoản Client để tiếp tục.");
  }

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={handleClick}>
      {children}
    </button>
  );
}
