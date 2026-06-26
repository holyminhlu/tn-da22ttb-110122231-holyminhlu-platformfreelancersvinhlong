import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type GeminiAdminSettings = {
  apiKey: string;
  model: string;
  apiKeySource: "none" | "file" | "env";
  modelSource: "file" | "env" | "default";
  apiKeyMasked: string;
  hasApiKey: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  suggestedModels: string[];
  envFallback: {
    hasApiKey: boolean;
    model: string | null;
  };
};

export async function getAdminAiSettings(): Promise<GeminiAdminSettings> {
  const { data } = await fetchApi<GeminiAdminSettings>(apiPaths.admin.aiSettings, { auth: true });
  return data;
}

export async function updateAdminAiSettings(payload: {
  apiKey?: string;
  model?: string;
  clearApiKey?: boolean;
}) {
  const { data } = await fetchApi<{ message: string; settings: GeminiAdminSettings }>(
    apiPaths.admin.aiSettings,
    { method: "PATCH", auth: true, body: payload },
  );
  return data;
}

export async function testAdminAiSettings() {
  const { data } = await fetchApi<{ message: string; ok: boolean; model: string; sample?: string }>(
    apiPaths.admin.aiSettingsTest,
    { method: "POST", auth: true, body: {} },
  );
  return data;
}
