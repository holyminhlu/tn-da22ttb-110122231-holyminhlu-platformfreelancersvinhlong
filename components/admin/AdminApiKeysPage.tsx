"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FaCheckCircle, FaKey, FaPlug, FaRedo, FaSave } from "react-icons/fa";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getAdminAiSettings,
  testAdminAiSettings,
  updateAdminAiSettings,
  type GeminiAdminSettings,
} from "@/lib/api/adminAiSettings";
import type { ApiError } from "@/lib/api/client";
import "./admin.css";

function sourceLabel(source: string) {
  if (source === "file") return "File runtime (ưu tiên)";
  if (source === "env") return "Biến môi trường .env";
  if (source === "default") return "Mặc định hệ thống";
  return "Chưa cấu hình";
}

export default function AdminApiKeysPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<GeminiAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const data = await getAdminAiSettings();
      setSettings(data);
      setModel(data.model);
      setApiKeyInput("");
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể tải cấu hình API." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setToast(null);
    try {
      const payload: { apiKey?: string; model?: string } = {};
      if (apiKeyInput.trim()) payload.apiKey = apiKeyInput.trim();
      if (model.trim() && model.trim() !== settings.model) payload.model = model.trim();

      if (!payload.apiKey && !payload.model) {
        setToast({ type: "err", message: "Nhập API key mới hoặc chọn model khác để lưu." });
        return;
      }

      const result = await updateAdminAiSettings(payload);
      setSettings(result.settings);
      setModel(result.settings.model);
      setApiKeyInput("");
      setToast({ type: "ok", message: result.message });
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể lưu cấu hình." });
    } finally {
      setSaving(false);
    }
  }

  async function handleUseEnvKey() {
    setSaving(true);
    setToast(null);
    try {
      const result = await updateAdminAiSettings({ clearApiKey: true });
      setSettings(result.settings);
      setApiKeyInput("");
      setToast({ type: "ok", message: "Đã xóa key runtime — dùng GEMINI_API_KEY từ .env (nếu có)." });
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể cập nhật." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setToast(null);
    try {
      const result = await testAdminAiSettings();
      setToast({
        type: "ok",
        message: `${result.message} Model: ${result.model}${result.sample ? ` — "${result.sample}"` : ""}`,
      });
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Kiểm tra kết nối thất bại." });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <p className="admin-page__muted">{t("Đang tải…")}</p>
      </div>
    );
  }

  return (
    <div className="admin-page admin-api-keys">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">
            <FaKey aria-hidden className="admin-page__title-icon" />
            {t("Quản lý API key")}
          </h1>
          <p className="admin-page__desc">
            {t(
              "Thay đổi Google Gemini API key và model cho chat AI / so sánh báo giá. Lưu trên file runtime của server — không ghi vào cơ sở dữ liệu.",
            )}
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void load()}>
          <FaRedo aria-hidden /> {t("Tải lại")}
        </button>
      </header>

      {toast ? (
        <p
          className={`admin-toast admin-toast--${toast.type}`}
          role={toast.type === "err" ? "alert" : "status"}
        >
          {toast.message}
        </p>
      ) : null}

      <section className="admin-card">
        <h2 className="admin-card__title">{t("Trạng thái hiện tại")}</h2>
        <dl className="admin-api-keys__meta">
          <div>
            <dt>{t("API key")}</dt>
            <dd>
              {settings?.hasApiKey ? (
                <code>{settings.apiKeyMasked}</code>
              ) : (
                <span className="admin-page__muted">{t("Chưa có")}</span>
              )}
              <span className="admin-api-keys__badge">{sourceLabel(settings?.apiKeySource || "none")}</span>
            </dd>
          </div>
          <div>
            <dt>{t("Model")}</dt>
            <dd>
              <code>{settings?.model}</code>
              <span className="admin-api-keys__badge">{sourceLabel(settings?.modelSource || "default")}</span>
            </dd>
          </div>
          {settings?.updatedAt ? (
            <div>
              <dt>{t("Cập nhật lần cuối")}</dt>
              <dd>
                {new Date(settings.updatedAt).toLocaleString("vi-VN")}
                {settings.updatedBy ? ` — ${settings.updatedBy}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <form className="admin-card" onSubmit={(e) => void handleSave(e)}>
        <h2 className="admin-card__title">{t("Cập nhật Gemini")}</h2>

        <label className="admin-field">
          <span className="admin-field__label">{t("API key mới (Google AI Studio)")}</span>
          <input
            type="password"
            className="admin-field__input"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={t("Dán API key tài khoản Google khác — để trống nếu không đổi")}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="admin-field__hint">
            {t("Key lưu tại backend/runtime/gemini-settings.json trên server. Ưu tiên hơn .env sau khi lưu.")}
          </span>
        </label>

        <label className="admin-field">
          <span className="admin-field__label">{t("Model Gemini")}</span>
          <select
            className="admin-field__input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {(settings?.suggestedModels ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span className="admin-field__hint">
            {t("Khuyến nghị gemini-2.5-flash-lite cho free tier. Tránh model hết quota.")}
          </span>
        </label>

        <div className="admin-api-keys__actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            <FaSave aria-hidden /> {saving ? t("Đang lưu…") : t("Lưu cấu hình")}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            disabled={testing}
            onClick={() => void handleTest()}
          >
            <FaPlug aria-hidden /> {testing ? t("Đang kiểm tra…") : t("Kiểm tra kết nối")}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            disabled={saving || settings?.apiKeySource !== "file"}
            onClick={() => void handleUseEnvKey()}
          >
            <FaCheckCircle aria-hidden /> {t("Dùng lại key từ .env")}
          </button>
        </div>
      </form>
    </div>
  );
}
