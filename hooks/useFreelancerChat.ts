"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listChatMessages,
  openChatConversation,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/api/chat";
import { emitChatMessage, getChatSocket, joinChatRoom } from "@/lib/chat/socketClient";

type UseFreelancerChatOptions = {
  freelancerId?: string;
  clientId?: string;
  conversationId?: string;
  currentUserId?: string | null;
  jobQuoteId?: string | null;
  serviceId?: string | null;
  contextTitle?: string | null;
  enabled?: boolean;
};

export function useFreelancerChat({
  freelancerId,
  clientId,
  conversationId,
  currentUserId,
  jobQuoteId,
  serviceId,
  contextTitle,
  enabled = true,
}: UseFreelancerChatOptions) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const joinedRef = useRef(false);
  const lastMessageAtRef = useRef<string | null>(null);

  const withMine = useCallback(
    (message: ChatMessage): ChatMessage => ({
      ...message,
      mine:
        message.mine ??
        (currentUserId ? String(message.senderId) === String(currentUserId) : false),
    }),
    [currentUserId],
  );

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      const normalized = withMine(message);
      lastMessageAtRef.current = normalized.createdAt;
      setMessages((prev) => {
        if (prev.some((m) => m.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
    },
    [withMine],
  );

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
        conv = { id: conversationId } as ChatConversation;
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
      const rows = await listChatMessages(conv.id);
      const normalized = rows.map(withMine);

      if (contextMessage && !normalized.some((m) => m.id === contextMessage.id)) {
        normalized.push(withMine(contextMessage));
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
    } finally {
      setLoading(false);
    }
  }, [
    clientId,
    contextTitle,
    conversationId,
    enabled,
    freelancerId,
    jobQuoteId,
    serviceId,
    withMine,
  ]);

  useEffect(() => {
    joinedRef.current = false;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!conversation?.id || !enabled) return;

    const socket = getChatSocket();
    if (!socket) return;

    const onMessage = (payload: ChatMessage) => {
      if (payload.conversationId !== conversation.id) return;
      appendMessage(payload);
    };

    socket.on("chat:message", onMessage);

    if (!joinedRef.current) {
      void joinChatRoom(socket, conversation.id).then((result) => {
        if (result.ok) joinedRef.current = true;
      });
    }

    const poll = window.setInterval(() => {
      const after = lastMessageAtRef.current ?? undefined;
      void listChatMessages(conversation.id, after)
        .then((rows) => {
          if (rows.length === 0) return;
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const row of rows.map(withMine)) {
              map.set(row.id, row);
              lastMessageAtRef.current = row.createdAt;
            }
            return [...map.values()].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
          });
        })
        .catch(() => {});
    }, 8000);

    return () => {
      socket.off("chat:message", onMessage);
      window.clearInterval(poll);
    };
  }, [appendMessage, conversation?.id, enabled, withMine]);

  const send = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text || !conversation?.id) return false;
      setSending(true);
      setError("");
      try {
        const socket = getChatSocket();
        if (socket?.connected) {
          const result = await emitChatMessage(socket, conversation.id, text);
          if (result.ok && result.message) {
            appendMessage(result.message);
            return true;
          }
          if (result.error) setError(result.error);
        }
        const message = await sendChatMessage(conversation.id, text);
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
    loading,
    sending,
    error,
    send,
    reload: bootstrap,
  };
}
