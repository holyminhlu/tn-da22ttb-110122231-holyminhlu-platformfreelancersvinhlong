import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type ChatContextType = "job" | "service";

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
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  updatedAt: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind?: "text" | "context";
  contextType?: ChatContextType | null;
  createdAt: string;
  mine?: boolean;
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

export async function listChatMessages(conversationId: string, after?: string) {
  const search = new URLSearchParams();
  if (after) search.set("after", after);
  const qs = search.toString();
  const path = qs
    ? `${apiPaths.chat.messages(conversationId)}?${qs}`
    : apiPaths.chat.messages(conversationId);
  const { data } = await fetchApi<{ messages: ChatMessage[] }>(path, { auth: true });
  return data.messages ?? [];
}

export async function sendChatMessage(conversationId: string, body: string) {
  const { data } = await fetchApi<{ message: ChatMessage }>(
    apiPaths.chat.messages(conversationId),
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ body }),
    },
  );
  return data.message;
}
