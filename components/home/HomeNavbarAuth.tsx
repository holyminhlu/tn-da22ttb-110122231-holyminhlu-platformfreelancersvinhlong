"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useStoredUser } from "@/hooks/useStoredUser";
import { FaEdit, FaSignInAlt } from "./icons";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserAvatarMenu from "./UserAvatarMenu";
import "@/components/notifications/notifications.css";

export default function HomeNavbarAuth() {
  const { t } = useTranslation();

  const { user, ready, isAdmin } = useStoredUser({ refreshFromApi: false });

  if (!ready) {
    return <div className="h-10 w-10 shrink-0 rounded-full bg-muted" aria-hidden />;
  }

  if (user) {
    return (
      <div className="notif-navbar-auth">
        {!isAdmin ? <NotificationBell /> : null}
        <UserAvatarMenu user={user} />
      </div>
    );
  }

  return (
    <>
      <Link href="/dang-ky" className="flex items-center text-muted-foreground hover:text-primary">
        <FaEdit className="mr-2 text-primary" /> {t("auth.register")}
      </Link>
      <Link href="/dang-nhap" className="flex items-center text-muted-foreground hover:text-primary">
        <FaSignInAlt className="mr-2 text-primary" /> {t("auth.login")}
      </Link>
    </>
  );
}
