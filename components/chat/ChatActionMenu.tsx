"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useRef } from "react";

export type ChatMenuItem = {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

type ChatActionMenuProps = {
  open: boolean;
  items: ChatMenuItem[];
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
};

export default function ChatActionMenu({
  open,
  items,
  onClose,
  anchorRef,
  align = "right",
}: ChatActionMenuProps) {
  const { t } = useTranslation();

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
  const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={`fw-chat-menu fw-chat-menu--${align}`}
      role="menu"
      aria-label={t("Tùy chọn")}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`fw-chat-menu__item${item.danger ? " fw-chat-menu__item--danger" : ""}`}
          disabled={item.disabled}
          onClick={() => {
            if (item.disabled) return;
            item.onClick();
            onClose();
          }}
        >
          {t(item.label)}
        </button>
      ))}
    </div>
  );
}
