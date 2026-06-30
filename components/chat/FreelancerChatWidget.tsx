"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FaBriefcase, FaComments, FaIdCard, FaStore } from "react-icons/fa";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import { useFreelancerChat } from "@/hooks/useFreelancerChat";
import { useStoredUser } from "@/hooks/useStoredUser";
import { resolveChatAssetUrl, type ChatMessage } from "@/lib/api/chat";
import { CLIENT_VERIFY_PAGE } from "@/lib/hire/clientVerification";
import ChatImageAttachment from "./ChatImageAttachment";
import "./chat.css";

type FreelancerChatWidgetProps = {
  freelancerId?: string;
  clientId?: string;
  conversationId?: string;
  peerName?: string;
  /** @deprecated dùng peerName */
  freelancerName?: string;
  jobTitle?: string | null;
  contextTitle?: string | null;
  jobQuoteId?: string | null;
  serviceId?: string | null;
  initialOpen?: boolean;
  mode?: "floating" | "inline" | "embedded";
  onClose?: () => void;
};

function formatChatTime(iso: string) {  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return formatDateUi(iso);
  }
}

function ChatMessageItem({ msg }: { msg: ChatMessage }) {
  if (msg.kind === "context") {
    const isService = msg.contextType === "service";
    return (
      <li className="vlc-chat-context-attach">
        <span className="vlc-chat-context-attach__icon" aria-hidden>
          {isService ? <FaStore /> : <FaBriefcase />}
        </span>
        <div className="vlc-chat-context-attach__body">
          <span className="vlc-chat-context-attach__label">
            {isService ? "Đang thảo luận dịch vụ" : "Đang thảo luận công việc"}
          </span>
          <span className="vlc-chat-context-attach__title">{msg.body}</span>
        </div>
        <span className="vlc-chat-context-attach__time">{formatChatTime(msg.createdAt)}</span>
      </li>
    );
  }

  const assetUrl = resolveChatAssetUrl(msg.attachmentUrl);

  return (
    <li
      className={`vlc-chat-bubble-row ${msg.mine ? "vlc-chat-bubble-row--mine" : "vlc-chat-bubble-row--theirs"}`}
    >
      <div className="vlc-chat-bubble-row__meta">
        <span className="vlc-chat-bubble-time">{formatChatTime(msg.createdAt)}</span>
        {msg.mine ? (
          <span className="vlc-chat-bubble-status">
            <span aria-hidden>{msg.readByPeer ? "✓✓" : "✓"}</span>
            {msg.readByPeer ? "Đã xem" : "Đã gửi"}
          </span>
        ) : null}
      </div>
      <div
        className={`vlc-chat-bubble ${msg.mine ? "vlc-chat-bubble--mine" : "vlc-chat-bubble--theirs"}`}
      >
        {msg.kind === "image" && assetUrl ? (
          <ChatImageAttachment
            src={assetUrl}
            alt={msg.attachmentName || "Ảnh"}
            buttonClassName="vlc-chat-bubble__image-btn"
            imageClassName="vlc-chat-bubble__image"
          />
        ) : null}
        {msg.kind === "file" && assetUrl ? (
          <a href={assetUrl} target="_blank" rel="noopener noreferrer" className="vlc-chat-bubble__file">
            {msg.attachmentName || msg.body}
          </a>
        ) : (
          msg.body
        )}
      </div>
    </li>
  );
}

export default function FreelancerChatWidget({
  freelancerId,
  clientId,
  conversationId,
  peerName,
  freelancerName,
  jobTitle,
  contextTitle,
  jobQuoteId,
  serviceId,
  initialOpen = false,
  mode = "floating",
  onClose,
}: FreelancerChatWidgetProps) {
  const { t, formatDate } = useTranslation();

  const displayName = peerName ?? freelancerName ?? "Đối tác";
  const { user, ready, isClient } = useStoredUser({ refreshFromApi: false });
  const clientVerify = useClientIdentityVerification({
    enabled: ready && isClient,
    refreshOnVisible: false,
  });
  const clientNeedsVerify = isClient && !clientVerify.loading && !clientVerify.verified;
  const isEmbedded = mode === "embedded";
  const [open, setOpen] = useState(isEmbedded || initialOpen);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const chatEnabled = !clientNeedsVerify && (isEmbedded || open) && Boolean(user?.id);

  const { conversation, messages, loading, sending, error, send } = useFreelancerChat({
    freelancerId,
    clientId,
    conversationId,
    peerId: freelancerId ?? clientId ?? null,
    currentUserId: user?.id,
    jobQuoteId,
    serviceId,
    contextTitle: contextTitle ?? jobTitle,
    enabled: chatEnabled,
  });

  const topicTitle =
    conversation?.contextTitle ?? conversation?.jobTitle ?? contextTitle ?? jobTitle ?? null;

  useEffect(() => {
    if (!isEmbedded) {
      setOpen(initialOpen);
    }
  }, [initialOpen, freelancerId, clientId, conversationId, isEmbedded]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, isEmbedded]);

  function handleClose() {
    if (isEmbedded) return;
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit(e: FormEvent) {
  e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const ok = await send(text);
    if (ok) setDraft("");
  }

  if (!user) {
    return null;
  }

  if (clientNeedsVerify) {
    if (mode === "embedded") {
      return (
        <div className="vlc-chat-fab-wrap vlc-chat-fab-wrap--embedded">
          <div className="vlc-chat-panel vlc-chat-panel--embedded vlc-chat-panel--verify" role="status">
            <p className="vlc-chat-panel__verify-text">
              {t("Hoàn thành xác minh danh tính (5 mục nhận dạng + thẻ tín dụng) để nhắn tin với freelancer.")}
            </p>
            <Link href={CLIENT_VERIFY_PAGE} className="vlc-chat-panel__verify-link">
              <FaIdCard aria-hidden />
              {t("Đi xác minh ngay")}
            </Link>
          </div>
        </div>
      );
    }

    if (mode === "floating") {
      return (
        <div className="vlc-chat-fab-wrap vlc-chat-fab-wrap--above-ai-support">
          {open ? (
            <div className="vlc-chat-panel vlc-chat-panel--verify" role="dialog" aria-label={t("Yêu cầu xác minh")}>
              <div className="vlc-chat-panel__head">
                <div className="vlc-chat-panel__title-wrap">
                  <FaComments className="shrink-0 text-[#0066cc]" aria-hidden />
                  <div className="min-w-0">
                    <div className="vlc-chat-panel__title">Nhắn tin — {displayName}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="vlc-chat-panel__close"
                  onClick={() => setOpen(false)}
                  aria-label={t("Đóng")}
                >
                  ✕
                </button>
              </div>
              <p className="vlc-chat-panel__verify-text">
                {t("Hoàn thành 5 mục thông tin nhận dạng và xác minh thẻ tín dụng (bước 2) tại trang xác minh trước khi nhắn tin.")}
              </p>
              <Link href={CLIENT_VERIFY_PAGE} className="vlc-chat-panel__verify-link">
                <FaIdCard aria-hidden />
                {t("Đi xác minh ngay")}
              </Link>
            </div>
          ) : null}
          <button
            type="button"
            className="vlc-chat-btn"
            onClick={() => setOpen(true)}
            aria-label={`Xác minh để nhắn tin với ${displayName}`}
            aria-expanded={open}
          >
            <svg height="1.6em" fill="white" viewBox="0 0 1000 1000" aria-hidden>
              <path d="M881.1,720.5H434.7L173.3,941V720.5h-54.4C58.8,720.5,10,671.1,10,610.2v-441C10,108.4,58.8,59,118.9,59h762.2C941.2,59,990,108.4,990,169.3v441C990,671.1,941.2,720.5,881.1,720.5L881.1,720.5z M935.6,169.3c0-30.4-24.4-55.2-54.5-55.2H118.9c-30.1,0-54.5,24.7-54.5,55.2v441c0,30.4,24.4,55.1,54.5,55.1h54.4h54.4v110.3l163.3-110.2H500h381.1c30.1,0,54.5-24.7,54.5-55.1V169.3L935.6,169.3z M717.8,444.8c-30.1,0-54.4-24.7-54.4-55.1c0-30.4,24.3-55.2,54.4-55.2c30.1,0,54.5,24.7,54.5,55.2C772.2,420.2,747.8,444.8,717.8,444.8L717.8,444.8z M500,444.8c-30.1,0-54.4-24.7-54.4-55.1c0-30.4,24.3-55.2,54.4-55.2c30.1,0,54.4,24.7,54.4,55.2C554.4,420.2,530.1,444.8,500,444.8L500,444.8z M282.2,444.8c-30.1,0-54.5-24.7-54.5-55.1c0-30.4,24.4-55.2,54.5-55.2c30.1,0,54.4,24.7,54.4,55.2C336.7,420.2,312.3,444.8,282.2,444.8L282.2,444.8z" />
            </svg>
            <span className="vlc-chat-btn__tooltip">{t("Xác minh để nhắn tin")}</span>
          </button>
        </div>
      );
    }

    return null;
  }

  const wrapClass = isEmbedded
    ? "vlc-chat-fab-wrap vlc-chat-fab-wrap--embedded"
    : mode === "floating"
      ? "vlc-chat-fab-wrap vlc-chat-fab-wrap--above-ai-support"
      : "vlc-chat-fab-wrap vlc-chat-fab-wrap--inline";

  const panelVisible = isEmbedded || open;

  return (
    <div className={wrapClass}>
      {panelVisible ? (
        <div
          className={`vlc-chat-panel${isEmbedded ? " vlc-chat-panel--embedded" : ""}`}
          role="dialog"
          aria-label={`Chat với ${displayName}`}
        >
          <div className="vlc-chat-panel__head">
            <div className="vlc-chat-panel__title-wrap">
              <FaComments className="shrink-0 text-[#0066cc]" aria-hidden />
              <div className="min-w-0">
                <div className="vlc-chat-panel__title">Nhắn tin — {displayName}</div>
                {topicTitle ? (
                  <div className="vlc-chat-panel__subtitle" title={topicTitle}>
                    {serviceId || conversation?.contextType === "service" ? "Dịch vụ" : "Công việc"}:{" "}
                    {topicTitle}
                  </div>
                ) : null}
              </div>
            </div>
            {!isEmbedded ? (
              <button
                type="button"
                className="vlc-chat-panel__close"
                onClick={handleClose}
                aria-label={t("Đóng chat")}
              >
                ✕
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="vlc-chat-panel__error" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="vlc-chat-panel__loading">{t("Đang tải tin nhắn...")}</p>
          ) : (
            <ul ref={listRef} className="vlc-chat-panel__messages">
              {messages.length === 0 ? (
                <li className="vlc-chat-panel__empty">{t("Chưa có tin nhắn. Hãy bắt đầu trò chuyện!")}</li>
              ) : (
                messages.map((msg) => <ChatMessageItem key={msg.id} msg={msg} />)
              )}
            </ul>
          )}

          <form className="vlc-chat-panel__composer" onSubmit={(e) => void handleSubmit(e)}>
            <input
              type="text"
              className="vlc-chat-panel__input"
              placeholder={t("Nhập tin nhắn...")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading || sending}
              maxLength={4000}
            />
            <button
              type="submit"
              className="vlc-chat-panel__send"
              disabled={loading || sending || !draft.trim()}
              aria-label={t("Gửi tin nhắn")}
            >
              ↑
            </button>
          </form>
        </div>
      ) : null}

      {mode === "floating" ? (
        <button
          type="button"
          className="vlc-chat-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Đóng chat" : `Chat với ${displayName}`}
          aria-expanded={open}
        >
          <svg height="1.6em" fill="white" viewBox="0 0 1000 1000" aria-hidden>
            <path d="M881.1,720.5H434.7L173.3,941V720.5h-54.4C58.8,720.5,10,671.1,10,610.2v-441C10,108.4,58.8,59,118.9,59h762.2C941.2,59,990,108.4,990,169.3v441C990,671.1,941.2,720.5,881.1,720.5L881.1,720.5z M935.6,169.3c0-30.4-24.4-55.2-54.5-55.2H118.9c-30.1,0-54.5,24.7-54.5,55.2v441c0,30.4,24.4,55.1,54.5,55.1h54.4h54.4v110.3l163.3-110.2H500h381.1c30.1,0,54.5-24.7,54.5-55.1V169.3L935.6,169.3z M717.8,444.8c-30.1,0-54.4-24.7-54.4-55.1c0-30.4,24.3-55.2,54.4-55.2c30.1,0,54.5,24.7,54.5,55.2C772.2,420.2,747.8,444.8,717.8,444.8L717.8,444.8z M500,444.8c-30.1,0-54.4-24.7-54.4-55.1c0-30.4,24.3-55.2,54.4-55.2c30.1,0,54.4,24.7,54.4,55.2C554.4,420.2,530.1,444.8,500,444.8L500,444.8z M282.2,444.8c-30.1,0-54.5-24.7-54.5-55.1c0-30.4,24.4-55.2,54.5-55.2c30.1,0,54.4,24.7,54.4,55.2C336.7,420.2,312.3,444.8,282.2,444.8L282.2,444.8z" />
          </svg>
          <span className="vlc-chat-btn__tooltip">{t("Nhắn tin")}</span>
        </button>
      ) : null}
    </div>
  );
}

export function FreelancerChatInlineButton({
  onClick,
  label = "Nhắn tin",
  disabled = false,
  href,
}: {
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
  href?: string;
}) {
  if (href) {
    return (
      <Link href={href} className="vlc-chat-inline-btn">
        <FaComments aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className="vlc-chat-inline-btn" onClick={onClick} disabled={disabled}>
      <FaComments aria-hidden />
      {label}
    </button>
  );
}
