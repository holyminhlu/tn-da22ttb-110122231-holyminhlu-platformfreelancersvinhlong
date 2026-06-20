"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaComments, FaEllipsisH, FaSearch } from "react-icons/fa";
import { useMessagesScrollLock } from "@/hooks/useMessagesScrollLock";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listChatConversations, type ChatConversation, type ChatMessage } from "@/lib/api/chat";
import { getChatSocket } from "@/lib/chat/socketClient";
import ChatActionMenu from "./ChatActionMenu";
import ChatPeerAvatar from "./ChatPeerAvatar";
import InboxChatPanel, { type InboxViewerRole } from "./InboxChatPanel";
import "./messages-inbox.css";

type InboxTab = "all" | "jobs";

export type MessagesInboxCopy = {
  guestMessage: string;
  wrongRoleMessage: string;
  emptyListMessage: string;
  emptyListHint: string;
};

type MessagesInboxProps = {
  viewerRole: InboxViewerRole;
  copy: MessagesInboxCopy;
};

function formatRelativeTime(iso: string | null) {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày`;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

function conversationPreview(conv: ChatConversation, currentUserId?: string) {
  const body = conv.lastMessageBody?.trim() || "Chưa có tin nhắn";
  const fromMe =
    conv.lastMessageSenderId &&
    currentUserId &&
    String(conv.lastMessageSenderId) === String(currentUserId);
  if (fromMe) return `Bạn: ${body}`;
  return body;
}

function hasJobContext(conv: ChatConversation) {
  const t = tUi;
  return Boolean(conv.contextTitle || conv.jobTitle || conv.jobQuoteId || conv.serviceId);
}

export default function MessagesInbox({
  viewerRole, copy }: MessagesInboxProps) {
  const { t } = useTranslation();

  const searchParams = useSearchParams();
  const deepLinkConversationId = searchParams.get("c");
  const { user, ready, isFreelancer, isClient } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;
  const canAccess =
    viewerRole === "freelancer" ? Boolean(user && isFreelancer) : Boolean(user && isClient);

  useMessagesScrollLock(canAccess);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const sidebarMenuRef = useRef<HTMLButtonElement>(null);
  const deepLinkHandled = useRef(false);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const load = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      setConversations([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const rows = await listChatConversations();
      setConversations(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        if (deepLinkConversationId && rows.some((r) => r.id === deepLinkConversationId)) {
          return deepLinkConversationId;
        }
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải tin nhắn.";
      setError(message);
      setConversations([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [canAccess, deepLinkConversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!deepLinkConversationId || deepLinkHandled.current || conversations.length === 0) return;
    if (conversations.some((c) => c.id === deepLinkConversationId)) {
      setSelectedId(deepLinkConversationId);
      setMobileShowThread(true);
      deepLinkHandled.current = true;
    }
  }, [conversations, deepLinkConversationId]);

  useEffect(() => {
    if (!canAccess) return;
    const timer = window.setInterval(() => {
      void listChatConversations()
        .then((rows) => setConversations(rows))
        .catch(() => {});
    }, 12000);
    return () => window.clearInterval(timer);
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess || !user?.id) return;

    const socket = getChatSocket();
    if (!socket) return;
    const userId = user.id;

    function onMessage(payload: ChatMessage) {
      const fromPeer = String(payload.senderId) !== String(userId);
      const isOpen = payload.conversationId === selectedIdRef.current;

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === payload.conversationId);
        if (!exists) {
          void listChatConversations()
            .then((rows) => setConversations(rows))
            .catch(() => {});
          return prev;
        }

        const next = prev.map((c) => {
          if (c.id !== payload.conversationId) return c;
          return {
            ...c,
            lastMessageBody: payload.body,
            lastMessageAt: payload.createdAt,
            lastMessageSenderId: payload.senderId,
            hasUnread: fromPeer && !isOpen,
          };
        });

        return [...next].sort(
          (a, b) =>
            new Date(b.lastMessageAt ?? b.updatedAt).getTime() -
            new Date(a.lastMessageAt ?? a.updatedAt).getTime(),
        );
      });
    }

    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:message", onMessage);
    };
  }, [canAccess, user?.id]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (activeTab === "jobs" && !hasJobContext(conv)) return false;
      if (!q) return true;
      const haystack = [conv.peerName, conv.contextTitle, conv.jobTitle, conv.lastMessageBody]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activeTab, conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  function selectConversation(id: string) {
  const t = tUi;
    setSelectedId(id);
    setMobileShowThread(true);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hasUnread: false } : c)),
    );
  }

  function handleConversationRead(conversationId: string) {
  const t = tUi;
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, hasUnread: false } : c)),
    );
  }

  function handleConversationDeleted(conversationId: string) {
  const t = tUi;
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== conversationId);
      setSelectedId((current) => {
        if (current !== conversationId) return current;
        return remaining[0]?.id ?? null;
      });
      return remaining;
    });
    setMobileShowThread(false);
  }

  function handleConversationUpdated(updated: ChatConversation) {
  const t = tUi;
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }

  const sidebarMenuItems = [
    {
      id: "refresh",
      label: "Làm mới danh sách",
      onClick: () => void load(),
    },
    {
      id: "all-tab",
      label: "Hiển thị: Tất cả",
      onClick: () => setActiveTab("all"),
    },
    {
      id: "jobs-tab",
      label: "Hiển thị: Có việc",
      onClick: () => setActiveTab("jobs"),
    },
  ];

  return (
    <div className="fw-messages-inbox">
      {isGuest ? (
        <p className="fw-messages-inbox__state">{copy.guestMessage}</p>
      ) : !canAccess ? (
        <p className="fw-messages-inbox__state">{copy.wrongRoleMessage}</p>
      ) : error ? (
        <p className="fw-messages-inbox__state fw-messages-inbox__state--error" role="alert">
          {error}
        </p>
      ) : (
        <>
          <aside
            className={`fw-inbox-sidebar${mobileShowThread ? " fw-inbox-sidebar--hidden-mobile" : ""}`}
            aria-label={t("Danh sách hội thoại")}
          >
            <div className="fw-inbox-sidebar__search-row">
              <div className="fw-inbox-sidebar__search">
                <FaSearch className="fw-inbox-sidebar__search-icon" aria-hidden />
                <input
                  type="search"
                  className="fw-inbox-sidebar__search-input"
                  placeholder={t("Tìm kiếm cuộc hội thoại")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={t("Tìm kiếm cuộc hội thoại")}
                />
              </div>
              <div className="fw-inbox-sidebar__menu-wrap">
                <button
                  ref={sidebarMenuRef}
                  type="button"
                  className="fw-inbox-sidebar__action"
                  aria-label={t("Tùy chọn danh sách")}
                  aria-expanded={sidebarMenuOpen}
                  onClick={() => setSidebarMenuOpen((prev) => !prev)}
                >
                  <FaEllipsisH />
                </button>
                <ChatActionMenu
                  open={sidebarMenuOpen}
                  items={sidebarMenuItems}
                  onClose={() => setSidebarMenuOpen(false)}
                  anchorRef={sidebarMenuRef}
                  align="right"
                />
              </div>
            </div>

            <div className="fw-inbox-sidebar__tabs" role="tablist" aria-label={t("Lọc hội thoại")}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "all"}
                className={`fw-inbox-sidebar__tab${activeTab === "all" ? " fw-inbox-sidebar__tab--active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                {t("Tất cả")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "jobs"}
                className={`fw-inbox-sidebar__tab${activeTab === "jobs" ? " fw-inbox-sidebar__tab--active" : ""}`}
                onClick={() => setActiveTab("jobs")}
              >
                {t("Có việc")}
              </button>
            </div>

            <div className="fw-inbox-sidebar__list">
              {loading ? (
                <p className="fw-inbox-sidebar__status">{t("Đang tải...")}</p>
              ) : filteredConversations.length === 0 ? (
                <div className="fw-inbox-sidebar__empty">
                  <FaComments aria-hidden />
                  <p>{search || activeTab === "jobs" ? "Không tìm thấy hội thoại." : copy.emptyListMessage}</p>
                  {!search && activeTab === "all" ? (
                    <p className="fw-inbox-sidebar__empty-hint">{copy.emptyListHint}</p>
                  ) : null}
                </div>
              ) : (
                <ul className="fw-inbox-sidebar__items">
                  {filteredConversations.map((conv) => {
                    const active = conv.id === selectedId;
                    const topic = conv.contextTitle || conv.jobTitle;
                    const showUnread = Boolean(conv.hasUnread) && !active;

                    return (
                      <li key={conv.id}>
                        <button
                          type="button"
                          className={`fw-inbox-sidebar__item${active ? " fw-inbox-sidebar__item--active" : ""}${showUnread ? " fw-inbox-sidebar__item--unread" : ""}`}
                          onClick={() => selectConversation(conv.id)}
                          aria-current={active ? "true" : undefined}
                        >
                          <div className="fw-inbox-sidebar__avatar-wrap">
                            <ChatPeerAvatar
                              conversation={conv}
                              size={48}
                              className="fw-inbox-sidebar__avatar"
                              imgClassName="fw-inbox-sidebar__avatar-img"
                              fallbackClassName="fw-inbox-sidebar__avatar-fallback"
                            />
                            {showUnread ? (
                              <span
                                className="fw-inbox-sidebar__unread-dot"
                                aria-label={t("Có tin nhắn chưa đọc")}
                              />
                            ) : null}
                          </div>
                          <div className="fw-inbox-sidebar__item-body">
                            <div className="fw-inbox-sidebar__item-top">
                              <span className="fw-inbox-sidebar__item-name">
                                {conv.peerName}
                                {conv.blockedByMe ? (
                                  <span className="fw-inbox-sidebar__blocked-tag">{t("Đã chặn")}</span>
                                ) : null}
                              </span>
                              <span className="fw-inbox-sidebar__item-time">
                                {formatRelativeTime(conv.lastMessageAt ?? conv.updatedAt)}
                              </span>
                            </div>
                            {topic ? (
                              <p className="fw-inbox-sidebar__item-topic" title={topic}>
                                {conv.contextType === "service" ? "Dịch vụ" : "Công việc"}: {topic}
                              </p>
                            ) : null}
                            <p className="fw-inbox-sidebar__item-preview">
                              {conversationPreview(conv, user?.id)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section
            className={`fw-inbox-main${mobileShowThread ? " fw-inbox-main--visible-mobile" : ""}`}
            aria-label={t("Nội dung chat")}
          >
            {selected ? (
              <InboxChatPanel
                key={selected.id}
                conversation={selected}
                viewerRole={viewerRole}
                showBack
                onBack={() => setMobileShowThread(false)}
                onConversationDeleted={handleConversationDeleted}
                onConversationUpdated={handleConversationUpdated}
                onConversationRead={handleConversationRead}
              />
            ) : (
              <div className="fw-inbox-main__empty">
                <FaComments aria-hidden />
                <p>{t("Chọn một hội thoại để xem tin nhắn.")}</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
