import type { ChatMessage } from "@/lib/api/chat";

export function isMessageReadByPeer(message: ChatMessage, peerLastReadAt: string | null | undefined) {
  if (!message.mine || !peerLastReadAt) return false;
  const readTime = new Date(peerLastReadAt).getTime();
  const sentTime = new Date(message.createdAt).getTime();
  if (Number.isNaN(readTime) || Number.isNaN(sentTime)) return false;
  return sentTime <= readTime;
}

export function applyReadStatusToMessages(
  messages: ChatMessage[],
  peerLastReadAt: string | null | undefined,
): ChatMessage[] {
  if (!peerLastReadAt) {
    return messages.map((m) => ({ ...m, readByPeer: false }));
  }
  return messages.map((m) => ({
    ...m,
    readByPeer: isMessageReadByPeer(m, peerLastReadAt),
  }));
}

export function mergePeerLastReadAt(current: string | null, incoming: string | null | undefined) {
  if (!incoming) return current;
  if (!current) return incoming;
  return new Date(incoming).getTime() > new Date(current).getTime() ? incoming : current;
}
