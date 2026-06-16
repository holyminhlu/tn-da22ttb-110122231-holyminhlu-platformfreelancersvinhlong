"use client";

import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import UserAvatar from "@/components/ui/UserAvatar";
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
      <UserAvatar
        src={conversation.peerAvatarUrl}
        name={conversation.peerName}
        size={size}
        className={imgClassName}
        imgClassName={imgClassName}
      />
    </div>
  );
}
