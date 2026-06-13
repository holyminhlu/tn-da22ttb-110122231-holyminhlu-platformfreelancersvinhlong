import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";
import { fetchApi } from "./client";

export type ChatContextType = "job" | "service";
export type ChatMessageKind = "text" | "context" | "image" | "file";

export type ChatConversation = {
  id: string;
  clientId: string;
  freelancerId: string;
  jobQuoteId: string | null;
  serviceId: string | null;
  contextTitle: string | null;
  contextType: ChatContextType | null;
  jobTitle: string | null;
  quoteStatus: string | null;
  peerId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  peerCompletedJobs?: number | null;
  blockedByMe?: boolean;
  blockedByPeer?: boolean;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  hasUnread?: boolean;
  updatedAt: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind?: ChatMessageKind;
  contextType?: ChatContextType | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  createdAt: string;
  mine?: boolean;
  readByPeer?: boolean;
};

export type ChatMessagesResult = {
  messages: ChatMessage[];
  peerLastReadAt: string | null;
};

export type ChatAttachmentUpload = {
  url: string;
  name: string;
  mime: string;
  kind: "image" | "file";
};

export async function listChatConversations() {
  const { data } = await fetchApi<{ conversations: ChatConversation[] }>(
    apiPaths.chat.listConversations,
    { auth: true },
  );
  return data.conversations ?? [];
}

type ChatOpenContext = {
  jobQuoteId?: string | null;
  serviceId?: string | null;
  contextTitle?: string | null;
};

export async function openChatConversation(
  params:
    | ({ freelancerId: string } & ChatOpenContext)
    | ({ clientId: string } & ChatOpenContext),
) {
  const body =
    "freelancerId" in params
      ? {
          freelancerId: params.freelancerId,
          jobQuoteId: params.jobQuoteId ?? null,
          serviceId: params.serviceId ?? null,
          contextTitle: params.contextTitle ?? null,
        }
      : {
          clientId: params.clientId,
          jobQuoteId: params.jobQuoteId ?? null,
          serviceId: params.serviceId ?? null,
          contextTitle: params.contextTitle ?? null,
        };

  const { data } = await fetchApi<{ conversation: ChatConversation; contextMessage?: ChatMessage }>(
    apiPaths.chat.openConversation,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(body),
    },
  );
  return data;
}

export async function listChatMessages(
  conversationId: string,
  after?: string,
  query?: string,
): Promise<ChatMessagesResult> {
  const search = new URLSearchParams();
  if (after) search.set("after", after);
  if (query?.trim()) search.set("q", query.trim());
  const qs = search.toString();
  const path = qs
    ? `${apiPaths.chat.messages(conversationId)}?${qs}`
    : apiPaths.chat.messages(conversationId);
  const { data } = await fetchApi<ChatMessagesResult>(path, { auth: true });
  return {
    messages: data.messages ?? [],
    peerLastReadAt: data.peerLastReadAt ?? null,
  };
}

export async function markChatConversationRead(conversationId: string) {
  const { data } = await fetchApi<{ ok: boolean; readAt: string }>(
    apiPaths.chat.read(conversationId),
    { method: "POST", auth: true },
  );
  return data;
}

export type SendChatMessagePayload = {
  body?: string;
  kind?: "text" | "image" | "file";
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
};

export async function sendChatMessage(conversationId: string, payload: SendChatMessagePayload) {
  const { data } = await fetchApi<{ message: ChatMessage }>(
    apiPaths.chat.messages(conversationId),
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    },
  );
  return data.message;
}

export async function deleteChatConversation(conversationId: string) {
  await fetchApi(apiPaths.chat.conversation(conversationId), {
    method: "DELETE",
    auth: true,
  });
}

export async function blockChatConversation(conversationId: string) {
  const { data } = await fetchApi<{ ok: boolean; blocked: boolean }>(
    apiPaths.chat.block(conversationId),
    { method: "POST", auth: true },
  );
  return data;
}

export async function unblockChatConversation(conversationId: string) {
  const { data } = await fetchApi<{ ok: boolean; blocked: boolean }>(
    apiPaths.chat.block(conversationId),
    { method: "DELETE", auth: true },
  );
  return data;
}

export async function uploadChatAttachment(conversationId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await fetchApi<{ attachment: ChatAttachmentUpload }>(
    apiPaths.chat.attachments(conversationId),
    {
      method: "POST",
      auth: true,
      body: form,
    },
  );
  return data.attachment;
}

export function resolveChatAssetUrl(url: string | null | undefined) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return apiUrl(url, getApiBaseUrl());
}
