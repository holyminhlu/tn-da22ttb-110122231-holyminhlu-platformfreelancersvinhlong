"use client";

import Image from "next/image";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import type { ChatConversation } from "@/lib/api/chat";
import { resolveAvatarSrc } from "@/lib/authSession";

type ChatPeerAvatarProps = {
  conversation: ChatConversation;
  size: number;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
};

export default function ChatPeerAvatar({
  conversation,
  size,
  className,
  imgClassName,
  fallbackClassName,
}: ChatPeerAvatarProps) {
  const avatarSrc = resolveAvatarSrc(conversation.peerAvatarUrl);
  const initial = (conversation.peerName || "?").charAt(0).toUpperCase();
  const peerIsFreelancer = conversation.peerId === conversation.freelancerId;

  if (peerIsFreelancer) {
    return (
      <FreelancerAvatarFrame
        completedJobs={conversation.peerCompletedJobs}
        size={size}
        src={avatarSrc}
        alt={conversation.peerName}
        fallback={initial}
        className={className}
        imgClassName={imgClassName}
      />
    );
  }

  return (
    <div className={className} aria-hidden>
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt=""
          width={size}
          height={size}
          className={imgClassName}
          unoptimized
        />
      ) : (
        <span className={fallbackClassName}>{initial}</span>
      )}
    </div>
  );
}
