"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/config/api.config";
import type { ChatMessage } from "@/lib/api/chat";

let sharedSocket: Socket | null = null;

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("vlc_access_token")?.trim() || null;
}

export function getChatSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (sharedSocket?.connected) {
    return sharedSocket;
  }

  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  sharedSocket = io(getApiBaseUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  return sharedSocket;
}

export function disconnectChatSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}

export function joinChatRoom(
  socket: Socket,
  conversationId: string,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    socket.emit("chat:join", { conversationId }, (ack: { ok: boolean; error?: string }) => {
      resolve(ack ?? { ok: false, error: "Không thể tham gia phòng chat." });
    });
  });
}

export function emitChatMessage(
  socket: Socket,
  conversationId: string,
  body: string,
): Promise<{ ok: boolean; message?: ChatMessage; error?: string }> {
  return new Promise((resolve) => {
    socket.emit(
      "chat:send",
      { conversationId, body },
      (ack: { ok: boolean; message?: ChatMessage; error?: string }) => {
        if (!ack) {
          resolve({ ok: false, error: "Không thể gửi tin nhắn." });
          return;
        }
        resolve(ack);
      },
    );
  });
}
