"use client";

import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";
import { FaEdit, FaSignInAlt } from "./icons";
import UserAvatarMenu from "./UserAvatarMenu";

export default function HomeNavbarAuth() {
  const { user, ready } = useStoredUser();

  if (!ready) {
    return <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100" aria-hidden />;
  }

  if (user) {
    return <UserAvatarMenu user={user} />;
  }

  return (
    <>
      <Link href="/dang-ky" className="flex items-center text-gray-600 hover:text-blue-600">
        <FaEdit className="mr-2 text-blue-500" /> Sign Up
      </Link>
      <Link href="/dang-nhap" className="flex items-center text-gray-600 hover:text-blue-600">
        <FaSignInAlt className="mr-2 text-blue-500" /> Log In
      </Link>
    </>
  );
}
