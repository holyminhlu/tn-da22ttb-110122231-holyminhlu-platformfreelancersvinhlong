"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useRef } from "react";
import { CHAT_EMOJI_GROUPS, CHAT_QUICK_EMOJIS } from "./chatEmojis";

type ChatEmojiPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export default function ChatEmojiPicker({
  open, onClose, onPick, anchorRef }: ChatEmojiPickerProps) {
  const { t } = useTranslation();

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
  const t = tUi;
  const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  return (
    <div ref={panelRef} className="fw-chat-emoji-picker" role="dialog" aria-label={t("Chọn emoji")}>
      <div className="fw-chat-emoji-picker__quick">
        {CHAT_QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="fw-chat-emoji-picker__btn"
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {CHAT_EMOJI_GROUPS.map((group) => (
        <div key={t(group.label)} className="fw-chat-emoji-picker__group">
          <p className="fw-chat-emoji-picker__label">{t(group.label)}</p>
          <div className="fw-chat-emoji-picker__grid">
            {group.emojis.map((emoji) => (
              <button
                key={`${t(group.label)}-${emoji}`}
                type="button"
                className="fw-chat-emoji-picker__btn"
                onClick={() => onPick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
