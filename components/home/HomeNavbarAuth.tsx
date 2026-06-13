"use client";

import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";
import { FaEdit, FaSignInAlt } from "./icons";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserAvatarMenu from "./UserAvatarMenu";
import "@/components/notifications/notifications.css";

export default function HomeNavbarAuth() {
  const { user, ready, isAdmin } = useStoredUser({ refreshFromApi: false });

  if (!ready) {
    return <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100" aria-hidden />;
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
      <Link href="/dang-ky" className="flex items-center text-gray-600 hover:text-blue-600">
        <FaEdit className="mr-2 text-blue-500" /> Đăng ký
      </Link>
      <Link href="/dang-nhap" className="flex items-center text-gray-600 hover:text-blue-600">
        <FaSignInAlt className="mr-2 text-blue-500" /> Đăng nhập
      </Link>
    </>
  );
}
