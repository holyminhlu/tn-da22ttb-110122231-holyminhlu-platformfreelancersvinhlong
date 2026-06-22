"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useStoredUser } from "@/hooks/useStoredUser";

export default function HomeNavbarLogo() {
  const { t } = useTranslation();
  const { user, ready, isFreelancer, isClient } = useStoredUser({ refreshFromApi: false });
  const href = ready && user && (isFreelancer || isClient) ? "/dashboard" : "/";

  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label={t("homeNavbar.logoAria")}>
      <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-background shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <Image
          src="/Logo/logochinhthuc.png"
          alt={t("homeNavbar.logoAlt")}
          width={64}
          height={64}
          className="h-full w-full scale-[1.45] object-contain"
          priority
        />
      </span>
    </Link>
  );
}
