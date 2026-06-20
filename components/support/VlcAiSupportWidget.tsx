"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";
import { usePathname } from "next/navigation";
import AiSupportMessageContent from "@/components/support/AiSupportMessageContent";
import { sendSupportAiChat, type SupportAiChatMessage } from "@/lib/api/supportAiChat";
import "./vlc-ai-support.css";

const WELCOME =
  "**Vĩnh Long Connect** có thể giúp gì cho bạn?\n\n💡 Gợi ý: Chọn câu hỏi nhanh bên dưới hoặc nhập câu hỏi của bạn.";

const HIDDEN_PATHS = new Set(["/hire/messages", "/findwork/messages"]);

const QUICK_PROMPTS = [
  "Cách tìm freelancer?",
  "Đăng tin tuyển dụng",
  "Xem báo giá thế nào?",
  "Nạp tiền ví",
];

function createWelcomeMessage(): SupportAiChatMessage {
  return { role: "assistant", content: WELCOME };
}

export default function VlcAiSupportWidget() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportAiChatMessage[]>([createWelcomeMessage()]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
  const t = tUi;
      if (event.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function sendMessage(text: string) {
  const t = tUi;
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError("");
    setSending(true);
    const userMessage: SupportAiChatMessage = { role: "user", content: trimmed };
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    try {
      const result = await sendSupportAiChat(trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể kết nối AI hỗ trợ.";
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
      setDraft(trimmed);
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
  const t = tUi;
    event.preventDefault();
    await sendMessage(draft);
  }

  function handleReset() {
  const t = tUi;
    setMessages([createWelcomeMessage()]);
    setError("");
    setDraft("");
  }

  if (pathname && HIDDEN_PATHS.has(pathname)) {
    return null;
  }

  return (
    <div
      className={`vlc-ai-support${open ? " vlc-ai-support--open" : ""}`}
      aria-live="polite"
    >
      {open ? (
        <div className="vlc-ai-support__panel" role="dialog" aria-modal="true" aria-label={t("Chat tư vấn AI")}>
          <header className="vlc-ai-support__head">
            <div className="vlc-ai-support__head-main">
              <FaRobot className="vlc-ai-support__head-icon" aria-hidden />
              <div>
                <p className="vlc-ai-support__eyebrow">{t("Trợ lý AI · VLC")}</p>
                <h2 className="vlc-ai-support__title">{t("Tư vấn trực tuyến")}</h2>
              </div>
            </div>
            <button
              type="button"
              className="vlc-ai-support__close"
              onClick={() => setOpen(false)}
              aria-label={t("Đóng chat AI")}
            >
              <FaTimes aria-hidden />
            </button>
          </header>

          <ul ref={listRef} className="vlc-ai-support__messages">
            {messages.map((msg, index) => (
              <li
                key={`${msg.role}-${index}`}
                className={`vlc-ai-support__msg vlc-ai-support__msg--${msg.role}`}
              >
                {msg.role === "assistant" ? (
                  <span className="vlc-ai-support__msg-icon" aria-hidden>
                    <FaRobot />
                  </span>
                ) : null}
                <div className="vlc-ai-support__bubble">
                  {msg.role === "assistant" ? (
                    <AiSupportMessageContent content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </li>
            ))}
            {sending ? (
              <li className="vlc-ai-support__msg vlc-ai-support__msg--assistant">
                <span className="vlc-ai-support__msg-icon" aria-hidden>
                  <FaRobot />
                </span>
                <div className="vlc-ai-support__bubble vlc-ai-support__bubble--typing">
                  <span />
                  <span />
                  <span />
                </div>
              </li>
            ) : null}
          </ul>

          {error ? (
            <p className="vlc-ai-support__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="vlc-ai-support__quick">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="vlc-ai-support__quick-btn"
                disabled={sending}
                onClick={() => void sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="vlc-ai-support__composer" onSubmit={(e) => void handleSubmit(e)}>
            <input
              type="text"
              className="vlc-ai-support__input"
              placeholder={t("Nhập câu hỏi...")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
              maxLength={2000}
            />
            <button type="submit" className="vlc-ai-support__send" disabled={sending || !draft.trim()}>
              {t("Gửi")}
            </button>
          </form>

          <button type="button" className="vlc-ai-support__reset" onClick={handleReset}>
            {t("Bắt đầu lại")}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="vlc-ai-support__fab"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI VLC"}
      >
        VLC AI
      </button>
    </div>
  );
}
