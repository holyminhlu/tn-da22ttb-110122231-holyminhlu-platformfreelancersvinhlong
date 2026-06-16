"use client";

import { useState } from "react";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
  imgClassName?: string;
  alt?: string;
};

export default function UserAvatar({
  src,
  name,
  email,
  size = 40,
  className,
  imgClassName,
  alt,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = resolveAvatarSrc(src);
  const showImage = Boolean(avatarSrc) && !failed;
  const label = alt ?? name ?? "Người dùng";
  const sizeStyle = { width: size, height: size };

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarSrc}
        alt={label}
        width={size}
        height={size}
        className={cn("rounded-full object-cover bg-gray-200", imgClassName, className)}
        style={sizeStyle}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600",
        className,
      )}
      style={{ ...sizeStyle, fontSize: Math.max(10, Math.round(size * 0.32)) }}
      aria-hidden={!alt}
      title={name ?? undefined}
    >
      {getUserInitials(name ?? undefined, email ?? undefined)}
    </span>
  );
}
