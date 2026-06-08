"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaComments, FaEllipsisH, FaSearch } from "react-icons/fa";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listChatConversations, type ChatConversation } from "@/lib/api/chat";
import { resolveAvatarSrc } from "@/lib/authSession";
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
  return Boolean(conv.contextTitle || conv.jobTitle || conv.jobQuoteId || conv.serviceId);
}

export default function MessagesInbox({ viewerRole, copy }: MessagesInboxProps) {
  const { user, ready, isFreelancer, isClient } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;
  const canAccess =
    viewerRole === "freelancer" ? Boolean(user && isFreelancer) : Boolean(user && isClient);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [mobileShowThread, setMobileShowThread] = useState(false);

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
  }, [canAccess]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canAccess) return;
    const timer = window.setInterval(() => {
      void listChatConversations()
        .then((rows) => setConversations(rows))
        .catch(() => {});
    }, 12000);
    return () => window.clearInterval(timer);
  }, [canAccess]);

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
    setSelectedId(id);
    setMobileShowThread(true);
  }

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
            aria-label="Danh sách hội thoại"
          >
            <div className="fw-inbox-sidebar__search-row">
              <div className="fw-inbox-sidebar__search">
                <FaSearch className="fw-inbox-sidebar__search-icon" aria-hidden />
                <input
                  type="search"
                  className="fw-inbox-sidebar__search-input"
                  placeholder="Tìm kiếm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="fw-inbox-sidebar__action" aria-label="Tùy chọn">
                <FaEllipsisH />
              </button>
            </div>

            <div className="fw-inbox-sidebar__tabs">
              <button
                type="button"
                className={`fw-inbox-sidebar__tab${activeTab === "all" ? " fw-inbox-sidebar__tab--active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`fw-inbox-sidebar__tab${activeTab === "jobs" ? " fw-inbox-sidebar__tab--active" : ""}`}
                onClick={() => setActiveTab("jobs")}
              >
                Có việc
              </button>
            </div>

            <div className="fw-inbox-sidebar__list">
              {loading ? (
                <p className="fw-inbox-sidebar__status">Đang tải...</p>
              ) : filteredConversations.length === 0 ? (
                <div className="fw-inbox-sidebar__empty">
                  <FaComments aria-hidden />
                  <p>{search ? "Không tìm thấy hội thoại." : copy.emptyListMessage}</p>
                  {!search ? (
                    <p className="fw-inbox-sidebar__empty-hint">{copy.emptyListHint}</p>
                  ) : null}
                </div>
              ) : (
                <ul className="fw-inbox-sidebar__items">
                  {filteredConversations.map((conv) => {
                    const active = conv.id === selectedId;
                    const avatarSrc = resolveAvatarSrc(conv.peerAvatarUrl);
                    const initial = (conv.peerName || "?").charAt(0).toUpperCase();
                    const topic = conv.contextTitle || conv.jobTitle;

                    return (
                      <li key={conv.id}>
                        <button
                          type="button"
                          className={`fw-inbox-sidebar__item${active ? " fw-inbox-sidebar__item--active" : ""}`}
                          onClick={() => selectConversation(conv.id)}
                          aria-current={active ? "true" : undefined}
                        >
                          <div className="fw-inbox-sidebar__avatar">
                            {avatarSrc ? (
                              <Image
                                src={avatarSrc}
                                alt=""
                                width={48}
                                height={48}
                                className="fw-inbox-sidebar__avatar-img"
                                unoptimized
                              />
                            ) : (
                              <span className="fw-inbox-sidebar__avatar-fallback">{initial}</span>
                            )}
                          </div>
                          <div className="fw-inbox-sidebar__item-body">
                            <div className="fw-inbox-sidebar__item-top">
                              <span className="fw-inbox-sidebar__item-name">{conv.peerName}</span>
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
            aria-label="Nội dung chat"
          >
            {selected ? (
              <InboxChatPanel
                key={selected.id}
                conversation={selected}
                viewerRole={viewerRole}
                showBack
                onBack={() => setMobileShowThread(false)}
              />
            ) : (
              <div className="fw-inbox-main__empty">
                <FaComments aria-hidden />
                <p>Chọn một hội thoại để xem tin nhắn.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
