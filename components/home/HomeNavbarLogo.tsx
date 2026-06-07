"use client";

import Image from "next/image";
import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";

export default function HomeNavbarLogo() {
  const { user, ready, isFreelancer, isClient } = useStoredUser({ refreshFromApi: false });
  const href = ready && user && (isFreelancer || isClient) ? "/dashboard" : "/";

  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label="Vĩnh Long Connect — về trang chủ">
      <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
        <Image
          src="/Logo/Logo.png"
          alt="Vĩnh Long Connect"
          width={64}
          height={64}
          className="h-full w-full object-contain p-1.5"
          priority
        />
      </span>
    </Link>
  );
}
