const fs = require("fs/promises");
const path = require("path");

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const SUGGESTED_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

const CONFIG_PATH = path.join(__dirname, "..", "..", "runtime", "gemini-settings.json");

function maskApiKey(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${"•".repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`;
}

async function readFileConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

function resolveConfig(fileConfig) {
  const fileKey = String(fileConfig?.apiKey || "").trim();
  const envKey = String(process.env.GEMINI_API_KEY || "").trim();
  const envModel = String(process.env.GEMINI_MODEL || "").trim();
  const fileModel = String(fileConfig?.model || "").trim();

  const apiKey = fileKey || envKey;
  const model = fileModel || envModel || DEFAULT_MODEL;

  let apiKeySource = "none";
  if (fileKey) apiKeySource = "file";
  else if (envKey) apiKeySource = "env";

  const modelSource = fileModel ? "file" : envModel ? "env" : "default";

  return {
    apiKey,
    model,
    apiKeySource,
    modelSource,
    apiKeyMasked: maskApiKey(apiKey),
    hasApiKey: Boolean(apiKey),
    updatedAt: fileConfig?.updatedAt || null,
    updatedBy: fileConfig?.updatedBy || null,
  };
}

async function getGeminiConfig() {
  const fileConfig = await readFileConfig();
  const resolved = resolveConfig(fileConfig);
  return { apiKey: resolved.apiKey, model: resolved.model };
}

async function getGeminiAdminSettings() {
  const fileConfig = await readFileConfig();
  const resolved = resolveConfig(fileConfig);
  return {
    ...resolved,
    suggestedModels: SUGGESTED_MODELS,
    envFallback: {
      hasApiKey: Boolean(String(process.env.GEMINI_API_KEY || "").trim()),
      model: String(process.env.GEMINI_MODEL || "").trim() || null,
    },
  };
}

async function saveGeminiAdminSettings({ apiKey, model, clearApiKey }, updatedBy) {
  const existing = (await readFileConfig()) || {};
  const next = { ...existing };

  if (clearApiKey === true) {
    delete next.apiKey;
  } else if (apiKey !== undefined) {
    const trimmed = String(apiKey || "").trim();
    if (!trimmed) {
      delete next.apiKey;
    } else {
      next.apiKey = trimmed;
    }
  }

  if (model !== undefined) {
    const trimmedModel = String(model || "").trim();
    if (!trimmedModel) {
      delete next.model;
    } else if (!SUGGESTED_MODELS.includes(trimmedModel)) {
      const err = new Error("Model không nằm trong danh sách cho phép.");
      err.code = "INVALID_MODEL";
      throw err;
    } else {
      next.model = trimmedModel;
    }
  }

  if (!next.apiKey && !next.model) {
    try {
      await fs.unlink(CONFIG_PATH);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    return getGeminiAdminSettings();
  }

  next.updatedAt = new Date().toISOString();
  next.updatedBy = updatedBy || null;

  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });

  return getGeminiAdminSettings();
}

async function testGeminiConnection() {
  const { apiKey, model } = await getGeminiConfig();
  if (!apiKey) {
    const err = new Error("GEMINI_NOT_CONFIGURED");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Trả lời một từ: OK" }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 16 },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.message ||
      `Gemini API trả về ${response.status}`;
    const err = new Error(apiMessage);
    err.code = "GEMINI_API_ERROR";
    throw err;
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { ok: true, model, sample: String(text).trim().slice(0, 80) };
}

module.exports = {
  DEFAULT_MODEL,
  SUGGESTED_MODELS,
  getGeminiConfig,
  getGeminiAdminSettings,
  saveGeminiAdminSettings,
  testGeminiConnection,
  maskApiKey,
};
