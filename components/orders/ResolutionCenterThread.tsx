"use client";

import { useState } from "react";
import { FaFilePdf, FaVideo } from "react-icons/fa";
import type { DisputeMessage } from "@/lib/api/resolution";
import { resolveAvatarSrc } from "@/lib/authSession";
import { formatDate } from "@/lib/format";
import { formatDeadlineCountdown } from "@/lib/orders/workflowSlaDisplay";

type ResolutionCenterThreadProps = {
  messages: DisputeMessage[];
  respondByAt?: string | null;
  disputeOpen: boolean;
  viewerRole: "client" | "freelancer" | "admin";
  busy?: boolean;
  onSend: (body: string) => void;
};

function roleLabel(role: string) {
  if (role === "admin") return "Quản trị viên";
  if (role === "freelancer") return "Freelancer";
  if (role === "client") return "Khách hàng";
  if (role === "system") return "Hệ thống";
  return role;
}

function parseAttachments(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => String(u)).filter(Boolean);
}

function fileNameFromUrl(url: string) {
  return decodeURIComponent(url.split("/").pop() || "minh-chung");
}

function attachmentKind(url: string): "image" | "pdf" | "video" | "file" {
  const lower = url.toLowerCase();
  if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(lower)) return "image";
  if (/\.pdf(\?|$)/i.test(lower)) return "pdf";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(lower)) return "video";
  return "file";
}

function DisputeAttachments({ urls }: { urls: string[] }) {
  if (!urls.length) return null;

  return (
    <ul className="resolution-thread__attachments">
      {urls.map((url) => {
        const href = resolveAvatarSrc(url) || url;
        const name = fileNameFromUrl(url);
        const kind = attachmentKind(url);

        if (kind === "image") {
          return (
            <li key={url} className="resolution-thread__attachment resolution-thread__attachment--image">
              <a href={href} target="_blank" rel="noopener noreferrer" title={name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={href} alt={name} loading="lazy" />
              </a>
            </li>
          );
        }

        return (
          <li key={url} className={`resolution-thread__attachment resolution-thread__attachment--${kind}`}>
            <a href={href} target="_blank" rel="noopener noreferrer">
              {kind === "pdf" ? <FaFilePdf aria-hidden /> : kind === "video" ? <FaVideo aria-hidden /> : null}
              <span>{name}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default function ResolutionCenterThread({
  messages,
  respondByAt,
  disputeOpen,
  viewerRole,
  busy,
  onSend,
}: ResolutionCenterThreadProps) {
  const [draft, setDraft] = useState("");
  const countdown = respondByAt ? formatDeadlineCountdown(respondByAt) : null;

  return (
    <div className="resolution-thread">
      <header className="resolution-thread__head">
        <h4 className="resolution-thread__title">Trung tâm giải quyết tranh chấp</h4>
        {countdown && disputeOpen ? (
          <p className="resolution-thread__countdown" role="status">
            Hạn phản hồi: <strong>{countdown}</strong>
            {viewerRole === "freelancer"
              ? " — nếu hết hạn, quyết định có thể nghiêng về phía khách hàng."
              : viewerRole === "admin"
                ? " — theo dõi và đưa ra quyết định khi đủ thông tin."
                : ""}
          </p>
        ) : null}
      </header>

      <div className="resolution-thread__messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="resolution-thread__empty">Chưa có tin nhắn.</p>
        ) : (
          messages.map((msg) => {
            const mine =
              (viewerRole === "client" && msg.author_role === "client") ||
              (viewerRole === "freelancer" && msg.author_role === "freelancer") ||
              (viewerRole === "admin" && msg.author_role === "admin");
            const attachments = parseAttachments(msg.attachments);
            const displayName = msg.author_name?.trim() || roleLabel(msg.author_role);

            return (
              <article
                key={msg.id}
                className={`resolution-thread__msg${mine ? " resolution-thread__msg--mine" : ""} resolution-thread__msg--${msg.author_role}`}
              >
                <header className="resolution-thread__msg-head">
                  <strong>{displayName}</strong>
                  <span className="resolution-thread__msg-role">{roleLabel(msg.author_role)}</span>
                  <time dateTime={msg.created_at}>{formatDate(msg.created_at)}</time>
                </header>
                <p className="resolution-thread__msg-body">{msg.body}</p>
                <DisputeAttachments urls={attachments} />
              </article>
            );
          })
        )}
      </div>

      {disputeOpen ? (
        <footer className="resolution-thread__composer">
          <textarea
            className="resolution-form__textarea"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Trao đổi với bên còn lại và Admin..."
          />
          <button
            type="button"
            className="resolution-form__btn"
            disabled={busy || draft.trim().length < 3}
            onClick={() => {
              onSend(draft.trim());
              setDraft("");
            }}
          >
            {busy ? "Đang gửi..." : "Gửi tin nhắn"}
          </button>
        </footer>
      ) : (
        <p className="resolution-thread__closed">Tranh chấp đã đóng — chỉ xem lại lịch sử trao đổi.</p>
      )}
    </div>
  );
}
