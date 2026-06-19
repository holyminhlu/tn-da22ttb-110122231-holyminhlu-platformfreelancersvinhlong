import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type SupportAiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SupportAiChatResult = {
  reply: string;
  model: string;
};

export async function sendSupportAiChat(message: string, history: SupportAiChatMessage[] = []) {
  const { data } = await fetchApi<SupportAiChatResult>(apiPaths.support.aiChat, {
    method: "POST",
    body: { message, history },
  });
  return data;
}
