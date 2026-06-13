"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listChatMessages,
  markChatConversationRead,
  openChatConversation,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
  type SendChatMessagePayload,
} from "@/lib/api/chat";
import {
  applyReadStatusToMessages,
  mergePeerLastReadAt,
} from "@/lib/chat/readStatus";
import {
  emitChatMessage,
  emitChatRead,
  getChatSocket,
  joinChatRoom,
  type ChatReadEvent,
} from "@/lib/chat/socketClient";

type UseFreelancerChatOptions = {
  freelancerId?: string;
  clientId?: string;
  conversationId?: string;
  currentUserId?: string | null;
  peerId?: string | null;
  jobQuoteId?: string | null;
  serviceId?: string | null;
  contextTitle?: string | null;
  enabled?: boolean;
  onMarkedRead?: (conversationId: string) => void;
};

export function useFreelancerChat({
  freelancerId,
  clientId,
  conversationId,
  currentUserId,
  peerId,
  jobQuoteId,
  serviceId,
  contextTitle,
  enabled = true,
  onMarkedRead,
}: UseFreelancerChatOptions) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const joinedRef = useRef(false);
  const socketInstanceRef = useRef<ReturnType<typeof getChatSocket>>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const markReadTimerRef = useRef<number | null>(null);
  const peerIdRef = useRef<string | null>(peerId ?? null);
  const currentUserIdRef = useRef<string | null>(currentUserId ?? null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId ?? null;
  }, [currentUserId]);

  useEffect(() => {
    if (peerId) peerIdRef.current = peerId;
  }, [peerId]);

  const withMine = useCallback(
    (message: ChatMessage): ChatMessage => ({
      ...message,
      mine:
        message.mine ??
        (currentUserId ? String(message.senderId) === String(currentUserId) : false),
    }),
    [currentUserId],
  );

  const applyReadStatus = useCallback(
    (rows: ChatMessage[], readAt: string | null) =>
      applyReadStatusToMessages(rows.map(withMine), readAt),
    [withMine],
  );

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      const normalized = withMine(message);
      lastMessageAtRef.current = normalized.createdAt;
      setMessages((prev) => {
        if (prev.some((m) => m.id === normalized.id)) return prev;
        return applyReadStatusToMessages([...prev, normalized], peerLastReadAt);
      });
    },
    [peerLastReadAt, withMine],
  );

  const markRead = useCallback(async () => {
    if (!conversation?.id || !enabled) return false;
    const socket = getChatSocket();
    try {
      if (socket?.connected) {
        const result = await emitChatRead(socket, conversation.id);
        if (result.ok) {
          onMarkedRead?.(conversation.id);
          return true;
        }
      } else {
        await markChatConversationRead(conversation.id);
        onMarkedRead?.(conversation.id);
        return true;
      }
    } catch {
      // best-effort
    }
    return false;
  }, [conversation?.id, enabled, onMarkedRead]);

  const scheduleMarkRead = useCallback(() => {
    if (!conversation?.id || !enabled) return;
    if (markReadTimerRef.current) window.clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = window.setTimeout(() => {
      void markRead();
    }, 350);
  }, [conversation?.id, enabled, markRead]);

  const bootstrap = useCallback(async () => {
    if (!enabled) return;
    const hasTarget = Boolean(conversationId || freelancerId || clientId);
    if (!hasTarget) return;

    setLoading(true);
    setError("");
    try {
      let conv: ChatConversation;
      let contextMessage: ChatMessage | undefined;

      if (conversationId) {
        conv = {
          id: conversationId,
          peerId: peerId ?? undefined,
          clientId: clientId ?? undefined,
          freelancerId: freelancerId ?? undefined,
        } as ChatConversation;
      } else if (freelancerId) {
        const opened = await openChatConversation({
          freelancerId,
          jobQuoteId,
          serviceId,
          contextTitle,
        });
        conv = opened.conversation;
        contextMessage = opened.contextMessage;
      } else {
        const opened = await openChatConversation({
          clientId: clientId!,
          jobQuoteId,
          serviceId,
          contextTitle,
        });
        conv = opened.conversation;
        contextMessage = opened.contextMessage;
      }

      setConversation(conv);
      peerIdRef.current =
        peerId ?? conv.peerId ?? (freelancerId ? freelancerId : clientId) ?? peerIdRef.current;

      const { messages: rows, peerLastReadAt: readAt } = await listChatMessages(conv.id);
      let normalized = applyReadStatus(rows, readAt);
      setPeerLastReadAt(readAt);

      if (contextMessage && !normalized.some((m) => m.id === contextMessage.id)) {
        normalized = applyReadStatus([...normalized, withMine(contextMessage)], readAt);
        normalized.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      }

      setMessages(normalized);
      lastMessageAtRef.current = normalized[normalized.length - 1]?.createdAt ?? null;
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể mở chat.";
      setError(message);
      setConversation(null);
      setMessages([]);
      setPeerLastReadAt(null);
    } finally {
      setLoading(false);
    }
  }, [
    applyReadStatus,
    clientId,
    contextTitle,
    conversationId,
    enabled,
    freelancerId,
    jobQuoteId,
    peerId,
    serviceId,
    withMine,
  ]);

  useEffect(() => {
    joinedRef.current = false;
    setPeerLastReadAt(null);
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!loading && conversation?.id && enabled) {
      scheduleMarkRead();
    }
  }, [conversation?.id, enabled, loading, scheduleMarkRead]);

  useEffect(() => {
    if (!conversation?.id || !enabled) return;

    const socket = getChatSocket();
    if (!socket) return;

    const convId = conversation.id;

    if (socketInstanceRef.current !== socket) {
      socketInstanceRef.current = socket;
      joinedRef.current = false;
    }

    const joinRoom = () => {
      void joinChatRoom(socket, convId).then((result) => {
        if (result.ok) joinedRef.current = true;
      });
    };

    const onConnect = () => {
      joinedRef.current = false;
      joinRoom();
    };

    const onMessage = (payload: ChatMessage) => {
      if (payload.conversationId !== conversation.id) return;
      appendMessage(payload);
      if (!withMine(payload).mine) {
        scheduleMarkRead();
      }
    };

    const onRead = (payload: ChatReadEvent) => {
      if (payload.conversationId !== conversation.id) return;
      if (String(payload.userId) === String(currentUserIdRef.current)) return;
      const expectedPeer = peerIdRef.current ?? conversation.peerId;
      if (!expectedPeer || String(payload.userId) !== String(expectedPeer)) return;
      setPeerLastReadAt((prev) => {
        const merged = mergePeerLastReadAt(prev, payload.readAt);
        setMessages((current) => applyReadStatusToMessages(current, merged));
        return merged;
      });
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:read", onRead);
    socket.on("connect", onConnect);

    if (socket.connected && !joinedRef.current) {
      joinRoom();
    }

    const poll = window.setInterval(() => {
      const after = lastMessageAtRef.current ?? undefined;
      void listChatMessages(conversation.id, after)
        .then(({ messages: rows, peerLastReadAt: readAt }) => {
          setPeerLastReadAt((prev) => {
            const merged = mergePeerLastReadAt(prev, readAt);
            if (rows.length > 0) {
              setMessages((current) => {
                const map = new Map(current.map((m) => [m.id, m]));
                for (const row of rows.map(withMine)) {
                  map.set(row.id, row);
                  lastMessageAtRef.current = row.createdAt;
                }
                return applyReadStatusToMessages(
                  [...map.values()].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  ),
                  merged,
                );
              });
            } else if (merged !== prev) {
              setMessages((current) => applyReadStatusToMessages(current, merged));
            }
            return merged;
          });
        })
        .catch(() => {});
    }, 8000);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:read", onRead);
      socket.off("connect", onConnect);
      window.clearInterval(poll);
      if (markReadTimerRef.current) window.clearTimeout(markReadTimerRef.current);
    };
  }, [
    appendMessage,
    conversation?.id,
    conversation?.peerId,
    enabled,
    scheduleMarkRead,
    withMine,
  ]);

  const send = useCallback(
    async (payload: string | SendChatMessagePayload) => {
      const normalized: SendChatMessagePayload =
        typeof payload === "string" ? { body: payload.trim(), kind: "text" } : payload;

      const text = String(normalized.body || "").trim();
      const hasAttachment = Boolean(normalized.attachmentUrl);
      if ((!text && !hasAttachment) || !conversation?.id) return false;

      setSending(true);
      setError("");
      try {
        const isPlainText = normalized.kind === "text" || !normalized.kind;
        const socket = getChatSocket();
        if (isPlainText && text && socket?.connected) {
          const result = await emitChatMessage(socket, conversation.id, text);
          if (result.ok && result.message) {
            appendMessage(result.message);
            return true;
          }
        }
        const message = await sendChatMessage(conversation.id, normalized);
        appendMessage(message);
        return true;
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể gửi tin nhắn.";
        setError(message);
        return false;
      } finally {
        setSending(false);
      }
    },
    [appendMessage, conversation?.id],
  );

  return {
    conversation,
    messages,
    peerLastReadAt,
    loading,
    sending,
    error,
    send,
    markRead,
    reload: bootstrap,
  };
}
