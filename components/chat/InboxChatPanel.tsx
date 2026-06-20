"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBriefcase,
  FaEllipsisH,
  FaFileAlt,
  FaImage,
  FaPaperclip,
  FaRegSmile,
  FaSearch,
  FaStore,
  FaThumbsUp,
  FaTimes,
} from "react-icons/fa";
import { useFreelancerChat } from "@/hooks/useFreelancerChat";
import { useStoredUser } from "@/hooks/useStoredUser";
import {
  blockChatConversation,
  deleteChatConversation,
  resolveChatAssetUrl,
  unblockChatConversation,
  uploadChatAttachment,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/api/chat";
import ChatActionMenu from "./ChatActionMenu";
import ChatEmojiPicker from "./ChatEmojiPicker";
import ChatPeerAvatar from "./ChatPeerAvatar";

export type InboxViewerRole = "client" | "freelancer";

type InboxChatPanelProps = {
  conversation: ChatConversation;
  viewerRole: InboxViewerRole;
  onBack?: () => void;
  showBack?: boolean;
  onConversationDeleted?: (conversationId: string) => void;
  onConversationUpdated?: (conversation: ChatConversation) => void;
  onConversationRead?: (conversationId: string) => void;
};

function formatChatTime(iso: string) {  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return formatDateUi(iso);
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

function highlightText(text: string, query: string) {

  const t = tUi;
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="fw-inbox-search-hit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function InboxMessage({ msg, searchQuery }: { msg: ChatMessage; searchQuery: string }) {
  const t = tUi;
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
            <p className="fw-inbox-context-card__title">{highlightText(msg.body, searchQuery)}</p>
          </div>
          <span className="fw-inbox-context-card__time">{formatChatTime(msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  const assetUrl = resolveChatAssetUrl(msg.attachmentUrl);

  return (
    <div className={`fw-inbox-msg ${msg.mine ? "fw-inbox-msg--mine" : "fw-inbox-msg--theirs"}`}>
      <div className={`fw-inbox-bubble ${msg.mine ? "fw-inbox-bubble--sent" : "fw-inbox-bubble--received"}`}>
        {msg.kind === "image" && assetUrl ? (
          <a href={assetUrl} target="_blank" rel="noopener noreferrer" className="fw-inbox-bubble__image-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl} alt={msg.attachmentName || "Ảnh"} className="fw-inbox-bubble__image" />
          </a>
        ) : null}
        {msg.kind === "file" && assetUrl ? (
          <a href={assetUrl} target="_blank" rel="noopener noreferrer" className="fw-inbox-bubble__file">
            <FaFileAlt aria-hidden />
            <span>{highlightText(msg.attachmentName || msg.body, searchQuery)}</span>
          </a>
        ) : null}
        {(msg.kind === "text" || !msg.kind || (msg.body && msg.kind !== "file")) && msg.kind !== "image" ? (
          <p className="fw-inbox-bubble__text">{highlightText(msg.body, searchQuery)}</p>
        ) : null}
        {msg.kind === "image" && msg.body && msg.body !== "Đã gửi ảnh" ? (
          <p className="fw-inbox-bubble__text">{highlightText(msg.body, searchQuery)}</p>
        ) : null}
        <div className="fw-inbox-bubble__meta">
          <span className="fw-inbox-bubble__time">{formatChatTime(msg.createdAt)}</span>
          {msg.mine ? (
            <span
              className={`fw-inbox-bubble__status${msg.readByPeer ? " fw-inbox-bubble__status--read" : ""}`}
            >
              <span aria-hidden>{msg.readByPeer ? "✓✓" : "✓"}</span>
              {msg.readByPeer ? "Đã xem" : "Đã gửi"}
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
  onConversationDeleted,
  onConversationUpdated,
  onConversationRead,
}: InboxChatPanelProps) {
  const { t, formatDate } = useTranslation();

  const router = useRouter();
  const { user } = useStoredUser({ refreshFromApi: false });
  const [draft, setDraft] = useState("");
  const [convState, setConvState] = useState(conversation);
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConvState(conversation);
  }, [conversation]);

  const topicTitle = convState.contextTitle ?? convState.jobTitle ?? null;
  const peerLabel = viewerRole === "client" ? "freelancer" : "client";
  const isBlocked = Boolean(convState.blockedByMe || convState.blockedByPeer);

  const { messages, loading, sending, error, send } = useFreelancerChat({
    conversationId: convState.id,
    peerId: convState.peerId,
    ...(viewerRole === "freelancer"
      ? { clientId: convState.clientId }
      : { freelancerId: convState.freelancerId }),
    currentUserId: user?.id,
    jobQuoteId: convState.jobQuoteId,
    serviceId: convState.serviceId,
    contextTitle: topicTitle,
    enabled: Boolean(user?.id),
    onMarkedRead: onConversationRead,
  });

  const filteredMessages = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((msg) => {
      const haystack = [msg.body, msg.attachmentName].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [messageSearch, messages]);

  const messageGroups = useMemo(() => groupMessagesByDate(filteredMessages), [filteredMessages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filteredMessages, convState.id, searchOpen]);

  async function handleSubmit(e: FormEvent) {
  const t = tUi;
  e.preventDefault();
    if (isBlocked) return;
    const text = draft.trim();
    if (!text) return;
    const ok = await send(text);
    if (ok) setDraft("");
  }

  async function handleUpload(file: File, preferImage: boolean) {

  const t = tUi;
    if (isBlocked || !convState.id) return;
    setUploading(true);
    try {
      const attachment = await uploadChatAttachment(convState.id, file);
      const ok = await send({
        body: preferImage ? "" : attachment.name,
        kind: attachment.kind,
        attachmentUrl: attachment.url,
        attachmentName: attachment.name,
        attachmentMime: attachment.mime,
      });
      if (!ok) return;
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi tệp đính kèm.";
      alert(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteConversation() {

  const t = tUi;
    if (!window.confirm(t("Xóa hội thoại này khỏi danh sách? Tin nhắn vẫn được lưu nếu đối phương gửi lại."))) {
      return;
    }
    setActionBusy(true);
    try {
      await deleteChatConversation(convState.id);
      onConversationDeleted?.(convState.id);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xóa hội thoại.";
      alert(message);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleBlock() {
  const t = tUi;
  const nextBlock = !convState.blockedByMe;
    const confirmMsg = nextBlock
      ? `Chặn tin nhắn từ ${convState.peerName}? Bạn sẽ không nhận tin nhắn mới từ người này.`
      : `Bỏ chặn ${convState.peerName}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionBusy(true);
    try {
      if (nextBlock) {
        await blockChatConversation(convState.id);
      } else {
        await unblockChatConversation(convState.id);
      }
      const updated = {
        ...convState,
        blockedByMe: nextBlock,
        blockedByPeer: nextBlock ? convState.blockedByPeer : false,
      };
      setConvState(updated);
      onConversationUpdated?.(updated);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật trạng thái chặn.";
      alert(message);
    } finally {
      setActionBusy(false);
    }
  }

  const peerProfileHref =
    viewerRole === "client"
      ? `/hire/search/${convState.freelancerId}`
      : null;

  const menuItems = [
    ...(peerProfileHref
      ? [
          {
            id: "profile",
            label: "Xem hồ sơ",
            onClick: () => {
              router.push(peerProfileHref);
            },
          },
        ]
      : []),
    {
      id: "search",
      label: searchOpen ? "Đóng tìm kiếm" : "Tìm trong hội thoại",
      onClick: () => setSearchOpen((prev) => !prev),
    },
    {
      id: "block",
      label: convState.blockedByMe ? "Bỏ chặn tin nhắn" : "Chặn tin nhắn",
      danger: !convState.blockedByMe,
      disabled: actionBusy,
      onClick: () => void handleToggleBlock(),
    },
    {
      id: "delete",
      label: "Xóa hội thoại",
      danger: true,
      disabled: actionBusy,
      onClick: () => void handleDeleteConversation(),
    },
  ];

  const contextSubtitle = topicTitle
    ? `${convState.contextType === "service" ? "Dịch vụ" : "Công việc"}: ${topicTitle}`
    : `Trao đổi trực tiếp với ${peerLabel}`;

  const composerDisabled = loading || sending || uploading || isBlocked;

  return (
    <div className="fw-inbox-chat">
      <header className="fw-inbox-chat__head">
        <div className="fw-inbox-chat__head-left">
          {showBack ? (
            <button
              type="button"
              className="fw-inbox-chat__back"
              onClick={onBack}
              aria-label={t("Quay lại danh sách")}
            >
              ←
            </button>
          ) : null}
          <ChatPeerAvatar
            conversation={convState}
            size={40}
            className="fw-inbox-chat__avatar"
            imgClassName="fw-inbox-chat__avatar-img"
            fallbackClassName="fw-inbox-chat__avatar-fallback"
          />
          <div className="fw-inbox-chat__head-text">
            <h2 className="fw-inbox-chat__name">{convState.peerName}</h2>
            <p className="fw-inbox-chat__subtitle" title={contextSubtitle}>
              {contextSubtitle}
            </p>
          </div>
        </div>
        <div className="fw-inbox-chat__head-actions">
          <button
            type="button"
            className={`fw-inbox-chat__icon-btn${searchOpen ? " fw-inbox-chat__icon-btn--active" : ""}`}
            aria-label={t("Tìm trong hội thoại")}
            aria-pressed={searchOpen}
            onClick={() => setSearchOpen((prev) => !prev)}
          >
            <FaSearch />
          </button>
          <div className="fw-inbox-chat__menu-wrap">
            <button
              ref={menuBtnRef}
              type="button"
              className="fw-inbox-chat__icon-btn"
              aria-label={t("Tùy chọn")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <FaEllipsisH />
            </button>
            <ChatActionMenu
              open={menuOpen}
              items={menuItems}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuBtnRef}
              align="right"
            />
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div className="fw-inbox-chat__search-bar">
          <FaSearch aria-hidden className="fw-inbox-chat__search-icon" />
          <input
            type="search"
            className="fw-inbox-chat__search-input"
            placeholder={t("Tìm tin nhắn trong hội thoại...")}
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="fw-inbox-chat__search-clear"
            aria-label={t("Đóng tìm kiếm")}
            onClick={() => {
              setSearchOpen(false);
              setMessageSearch("");
            }}
          >
            <FaTimes />
          </button>
        </div>
      ) : null}

      {isBlocked ? (
        <p className="fw-inbox-chat__blocked-banner" role="status">
          {convState.blockedByMe
            ? `Bạn đã chặn tin nhắn từ ${convState.peerName}.`
            : `${convState.peerName} đã chặn tin nhắn. Bạn không thể gửi tin nhắn mới.`}
          {convState.blockedByMe ? (
            <button type="button" className="fw-inbox-chat__blocked-action" onClick={() => void handleToggleBlock()}>
              {t("Bỏ chặn")}
            </button>
          ) : null}
        </p>
      ) : null}

      {error ? (
        <p className="fw-inbox-chat__error" role="alert">
          {error}
        </p>
      ) : null}

      <div ref={listRef} className="fw-inbox-chat__messages">
        {loading ? (
          <p className="fw-inbox-chat__loading">{t("Đang tải tin nhắn...")}</p>
        ) : filteredMessages.length === 0 ? (
          <p className="fw-inbox-chat__empty">
            {messageSearch ? "Không tìm thấy tin nhắn phù hợp." : "Chưa có tin nhắn. Hãy bắt đầu trò chuyện!"}
          </p>
        ) : (
          messageGroups.map((group) => (
            <div key={t(group.label)} className="fw-inbox-chat__day-group">
              <div className="fw-inbox-chat__date-sep">
                <span>{t(group.label)}</span>
              </div>
              {group.items.map((msg) => (
                <InboxMessage key={msg.id} msg={msg} searchQuery={messageSearch} />
              ))}
            </div>
          ))
        )}
      </div>

      <footer className="fw-inbox-chat__composer">
        <div className="fw-inbox-chat__toolbar">
          <div className="fw-inbox-chat__tool-wrap">
            <button
              ref={emojiBtnRef}
              type="button"
              className={`fw-inbox-chat__tool${emojiOpen ? " fw-inbox-chat__tool--active" : ""}`}
              aria-label={t("Biểu cảm")}
              disabled={composerDisabled}
              onClick={() => setEmojiOpen((prev) => !prev)}
            >
              <FaRegSmile />
            </button>
            <ChatEmojiPicker
              open={emojiOpen}
              onClose={() => setEmojiOpen(false)}
              onPick={(emoji) => {
                setDraft((prev) => `${prev}${emoji}`);
                setEmojiOpen(false);
              }}
              anchorRef={emojiBtnRef}
            />
          </div>
          <button
            type="button"
            className="fw-inbox-chat__tool"
            aria-label={t("Gửi ảnh")}
            disabled={composerDisabled}
            onClick={() => imageInputRef.current?.click()}
          >
            <FaImage />
          </button>
          <button
            type="button"
            className="fw-inbox-chat__tool"
            aria-label={t("Đính kèm tệp")}
            disabled={composerDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <FaPaperclip />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="fw-inbox-chat__file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleUpload(file, true);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,image/*"
            className="fw-inbox-chat__file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleUpload(file, false);
            }}
          />
          {uploading ? <span className="fw-inbox-chat__uploading">{t("Đang tải lên...")}</span> : null}
        </div>
        <form className="fw-inbox-chat__input-row" onSubmit={(e) => void handleSubmit(e)}>
          <input
            type="text"
            className="fw-inbox-chat__input"
            placeholder={
              isBlocked
                ? "Không thể gửi tin nhắn"
                : `Nhập tin nhắn tới ${convState.peerName}`
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={composerDisabled}
            maxLength={4000}
          />
          <button
            type="submit"
            className="fw-inbox-chat__send-like"
            disabled={composerDisabled || !draft.trim()}
            aria-label={t("Gửi tin nhắn")}
          >
            <FaThumbsUp />
          </button>
        </form>
      </footer>

    </div>
  );
}
