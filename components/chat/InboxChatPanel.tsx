"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBriefcase,
  FaEllipsisH,
  FaImage,
  FaPaperclip,
  FaRegSmile,
  FaSearch,
  FaStore,
  FaThumbsUp,
} from "react-icons/fa";
import { useFreelancerChat } from "@/hooks/useFreelancerChat";
import { useStoredUser } from "@/hooks/useStoredUser";
import type { ChatConversation, ChatMessage } from "@/lib/api/chat";
import ChatPeerAvatar from "./ChatPeerAvatar";
import { formatDate } from "@/lib/format";

export type InboxViewerRole = "client" | "freelancer";

type InboxChatPanelProps = {
  conversation: ChatConversation;
  viewerRole: InboxViewerRole;
  onBack?: () => void;
  showBack?: boolean;
};

function formatChatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return formatDate(iso);
  }
}

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(d, today)) return "Hôm nay";
  if (sameDay(d, yesterday)) return "Hôm qua";
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const date = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${weekdays[d.getDay()]} ${date}`;
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { label: string; items: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const label = formatDateSeparator(msg.createdAt);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, items: [msg] });
    } else {
      last.items.push(msg);
    }
  }
  return groups;
}

function InboxMessage({ msg }: { msg: ChatMessage }) {
  if (msg.kind === "context") {
    const isService = msg.contextType === "service";
    return (
      <div className="fw-inbox-msg fw-inbox-msg--context">
        <div className="fw-inbox-context-card">
          <span className="fw-inbox-context-card__icon" aria-hidden>
            {isService ? <FaStore /> : <FaBriefcase />}
          </span>
          <div className="fw-inbox-context-card__body">
            <span className="fw-inbox-context-card__label">
              {isService ? "Đang thảo luận dịch vụ" : "Đang thảo luận công việc"}
            </span>
            <p className="fw-inbox-context-card__title">{msg.body}</p>
          </div>
          <span className="fw-inbox-context-card__time">{formatChatTime(msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fw-inbox-msg ${msg.mine ? "fw-inbox-msg--mine" : "fw-inbox-msg--theirs"}`}>
      <div className={`fw-inbox-bubble ${msg.mine ? "fw-inbox-bubble--sent" : "fw-inbox-bubble--received"}`}>
        <p className="fw-inbox-bubble__text">{msg.body}</p>
        <div className="fw-inbox-bubble__meta">
          <span className="fw-inbox-bubble__time">{formatChatTime(msg.createdAt)}</span>
          {msg.mine ? (
            <span className="fw-inbox-bubble__status">
              <span aria-hidden>✓</span> Đã gửi
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function InboxChatPanel({
  conversation,
  viewerRole,
  onBack,
  showBack = false,
}: InboxChatPanelProps) {
  const { user } = useStoredUser({ refreshFromApi: false });
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const topicTitle = conversation.contextTitle ?? conversation.jobTitle ?? null;
  const peerLabel = viewerRole === "client" ? "freelancer" : "client";

  const { messages, loading, sending, error, send } = useFreelancerChat({
    conversationId: conversation.id,
    ...(viewerRole === "freelancer"
      ? { clientId: conversation.clientId }
      : { freelancerId: conversation.freelancerId }),
    currentUserId: user?.id,
    jobQuoteId: conversation.jobQuoteId,
    serviceId: conversation.serviceId,
    contextTitle: topicTitle,
    enabled: Boolean(user?.id),
  });

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, conversation.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const ok = await send(text);
    if (ok) setDraft("");
  }

  const contextSubtitle = topicTitle
    ? `${conversation.contextType === "service" ? "Dịch vụ" : "Công việc"}: ${topicTitle}`
    : `Trao đổi trực tiếp với ${peerLabel}`;

  return (
    <div className="fw-inbox-chat">
      <header className="fw-inbox-chat__head">
        <div className="fw-inbox-chat__head-left">
          {showBack ? (
            <button
              type="button"
              className="fw-inbox-chat__back"
              onClick={onBack}
              aria-label="Quay lại danh sách"
            >
              ←
            </button>
          ) : null}
          <ChatPeerAvatar
            conversation={conversation}
            size={40}
            className="fw-inbox-chat__avatar"
            imgClassName="fw-inbox-chat__avatar-img"
            fallbackClassName="fw-inbox-chat__avatar-fallback"
          />
          <div className="fw-inbox-chat__head-text">
            <h2 className="fw-inbox-chat__name">{conversation.peerName}</h2>
            <p className="fw-inbox-chat__subtitle" title={contextSubtitle}>
              {contextSubtitle}
            </p>
          </div>
        </div>
        <div className="fw-inbox-chat__head-actions">
          <button type="button" className="fw-inbox-chat__icon-btn" aria-label="Tìm trong hội thoại">
            <FaSearch />
          </button>
          <button type="button" className="fw-inbox-chat__icon-btn" aria-label="Tùy chọn">
            <FaEllipsisH />
          </button>
        </div>
      </header>

      {error ? (
        <p className="fw-inbox-chat__error" role="alert">
          {error}
        </p>
      ) : null}

      <div ref={listRef} className="fw-inbox-chat__messages">
        {loading ? (
          <p className="fw-inbox-chat__loading">Đang tải tin nhắn...</p>
        ) : messages.length === 0 ? (
          <p className="fw-inbox-chat__empty">Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
        ) : (
          messageGroups.map((group) => (
            <div key={group.label} className="fw-inbox-chat__day-group">
              <div className="fw-inbox-chat__date-sep">
                <span>{group.label}</span>
              </div>
              {group.items.map((msg) => (
                <InboxMessage key={msg.id} msg={msg} />
              ))}
            </div>
          ))
        )}
      </div>

      <footer className="fw-inbox-chat__composer">
        <div className="fw-inbox-chat__toolbar">
          <button type="button" className="fw-inbox-chat__tool" aria-label="Biểu cảm" disabled>
            <FaRegSmile />
          </button>
          <button type="button" className="fw-inbox-chat__tool" aria-label="Gửi ảnh" disabled>
            <FaImage />
          </button>
          <button type="button" className="fw-inbox-chat__tool" aria-label="Đính kèm" disabled>
            <FaPaperclip />
          </button>
        </div>
        <form className="fw-inbox-chat__input-row" onSubmit={(e) => void handleSubmit(e)}>
          <input
            type="text"
            className="fw-inbox-chat__input"
            placeholder={`Nhập tin nhắn tới ${conversation.peerName}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={loading || sending}
            maxLength={4000}
          />
          <button
            type="submit"
            className="fw-inbox-chat__send-like"
            disabled={loading || sending || !draft.trim()}
            aria-label="Gửi tin nhắn"
          >
            <FaThumbsUp />
          </button>
        </form>
      </footer>
    </div>
  );
}
