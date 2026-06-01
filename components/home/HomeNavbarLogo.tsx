"use client";

import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";

export default function HomeNavbarLogo() {
  const { user, ready, isFreelancer, isClient } = useStoredUser({ refreshFromApi: false });
  const href = ready && user && (isFreelancer || isClient) ? "/dashboard" : "/";

  return (
    <Link href={href} className="flex items-center">
      <span className="text-xl font-bold tracking-tight text-[#1c2e4a]">
        VLC<span className="text-[#0066cc]">Connected</span>
      </span>
    </Link>
  );
}
