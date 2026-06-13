"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FaEllipsisV, FaPen, FaTrashAlt } from "react-icons/fa";

type PaymentMethodMenuProps = {
  methodLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export default function PaymentMethodMenu({
  methodLabel,
  onEdit,
  onDelete,
  disabled = false,
}: PaymentMethodMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleDelete() {
    setOpen(false);
    const confirmed = window.confirm(
      `Xóa phương thức "${methodLabel}"?\n\nHành động này không thể hoàn tác.`,
    );
    if (confirmed) onDelete();
  }

  function handleEdit() {
    setOpen(false);
    onEdit();
  }

  return (
    <div className="payments-method-menu" ref={rootRef}>
      <button
        type="button"
        className="payments-method-menu__trigger"
        aria-label={`Tùy chọn cho ${methodLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <FaEllipsisV aria-hidden />
      </button>
      {open ? (
        <div id={menuId} className="payments-method-menu__dropdown" role="menu">
          <button
            type="button"
            className="payments-method-menu__item"
            role="menuitem"
            onClick={handleEdit}
          >
            <FaPen aria-hidden />
            Cập nhật
          </button>
          <button
            type="button"
            className="payments-method-menu__item payments-method-menu__item--danger"
            role="menuitem"
            onClick={handleDelete}
          >
            <FaTrashAlt aria-hidden />
            Xóa
          </button>
        </div>
      ) : null}
    </div>
  );
}
