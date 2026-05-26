"use client";

import { useState } from "react";
import { createPortfolio } from "@/lib/api/users";

type AddPortfolioDialogProps = {
  onClose: () => void;
  onSaved: () => void;
};

export default function AddPortfolioDialog({ onClose, onSaved }: AddPortfolioDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert("Tiêu đề portfolio là bắt buộc.");
      return;
    }
    setSaving(true);
    try {
      await createPortfolio({
        title: trimmedTitle,
        description: description.trim() || undefined,
        projectUrl: projectUrl.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể thêm portfolio.";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ea-dialog-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <form
        className="ea-dialog"
        role="dialog"
        aria-labelledby="add-portfolio-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <h3 id="add-portfolio-title">Thêm portfolio</h3>
        <input
          className="ea-dialog-input"
          placeholder="Tiêu đề dự án"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
        <textarea
          className="ea-dialog-input min-h-[4rem] resize-y"
          placeholder="Mô tả ngắn"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="ea-dialog-input"
          placeholder="Link dự án (tùy chọn)"
          value={projectUrl}
          onChange={(e) => setProjectUrl(e.target.value)}
        />
        <div className="ea-dialog-actions">
          <button
            type="button"
            className="ea-dialog-btn ea-dialog-btn--ghost"
            disabled={saving}
            onClick={onClose}
          >
            Hủy
          </button>
          <button type="submit" className="ea-dialog-btn ea-dialog-btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : "Thêm"}
          </button>
        </div>
      </form>
    </div>
  );
}
