"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStoredUser } from "@/hooks/useStoredUser";
import { ADMIN_HOME, isUserOnlyPath } from "@/lib/auth/roleRoutes";

export default function RedirectAdminFromUserRoutes({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, isAdmin } = useStoredUser({ refreshFromApi: false });

  useEffect(() => {
    if (!ready || !isAdmin) return;
    if (!isUserOnlyPath(pathname)) return;
    router.replace(ADMIN_HOME);
  }, [ready, isAdmin, pathname, router]);

  if (ready && isAdmin && isUserOnlyPath(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Đang chuyển đến trang quản trị…
      </div>
    );
  }

  return children;
}
