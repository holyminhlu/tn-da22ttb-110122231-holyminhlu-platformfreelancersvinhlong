"use client";

import { useRef, useState } from "react";
import { createExclusiveResource, uploadProfileFile } from "@/lib/api/users";

type AddExclusiveResourceDialogProps = {
  onClose: () => void;
  onSaved: () => void;
};

type ResourceMode = "link" | "file";

export default function AddExclusiveResourceDialog({ onClose, onSaved }: AddExclusiveResourceDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ResourceMode>("link");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadProfileFile(file);
      setUploadedFile({ url: result.url, fileName: result.fileName });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải tệp.";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Tiêu đề tài nguyên là bắt buộc.");
      return;
    }
    if (mode === "link" && !linkUrl.trim()) {
      setError("Vui lòng nhập link tài nguyên.");
      return;
    }
    if (mode === "file" && !uploadedFile) {
      setError("Vui lòng tải lên tệp tài nguyên.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createExclusiveResource({
        title: trimmedTitle,
        description: description.trim() || undefined,
        resourceType: mode,
        linkUrl: mode === "link" ? linkUrl.trim() : undefined,
        fileUrl: mode === "file" ? uploadedFile?.url : undefined,
        fileName: mode === "file" ? uploadedFile?.fileName : undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể thêm tài nguyên.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mp-dialog-backdrop" role="presentation" onClick={() => !saving && !uploading && onClose()}>
      <form
        className="mp-dialog mp-dialog--wide"
        role="dialog"
        aria-labelledby="add-resource-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="mp-dialog__head">
          <div>
            <h3 id="add-resource-title" className="mp-dialog__title">
              Thêm tài nguyên dành riêng
            </h3>
            <p className="mp-dialog__lead">
              Chia sẻ link hoặc tệp chỉ dành cho khách hàng đã thuê bạn.
            </p>
          </div>
        </div>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">Tiêu đề *</span>
          <input
            className="mp-dialog__input"
            placeholder="VD: Bộ template Figma cho client VIP"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">Mô tả ngắn</span>
          <textarea
            className="mp-dialog__input mp-dialog__textarea"
            placeholder="Giải thích nội dung và cách khách hàng sử dụng..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <div className="mp-dialog__field">
          <span className="mp-dialog__label">Loại tài nguyên</span>
          <div className="mp-dialog__mode-row">
            <button
              type="button"
              className={`mp-dialog__mode-btn${mode === "link" ? " mp-dialog__mode-btn--active" : ""}`}
              onClick={() => setMode("link")}
            >
              Link
            </button>
            <button
              type="button"
              className={`mp-dialog__mode-btn${mode === "file" ? " mp-dialog__mode-btn--active" : ""}`}
              onClick={() => setMode("file")}
            >
              Tệp tin
            </button>
          </div>
        </div>

        {mode === "link" ? (
          <label className="mp-dialog__field">
            <span className="mp-dialog__label">Link tài nguyên *</span>
            <input
              className="mp-dialog__input"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </label>
        ) : (
          <div className="mp-dialog__field">
            <span className="mp-dialog__label">Tệp tài nguyên *</span>
            <input
              ref={fileInputRef}
              type="file"
              className="mp-dialog__file-input"
              onChange={(e) => void handleFileChange(e)}
            />
            <button
              type="button"
              className="mp-dialog__upload-btn"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Đang tải..." : uploadedFile ? "Đổi tệp" : "Chọn tệp"}
            </button>
            {uploadedFile ? (
              <p className="mp-dialog__upload-name">{uploadedFile.fileName}</p>
            ) : (
              <p className="mp-dialog__hint">PDF, Word, Excel, ZIP hoặc ảnh (tối đa 15MB).</p>
            )}
          </div>
        )}

        {error ? (
          <p className="mp-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mp-dialog__actions">
          <button
            type="button"
            className="mp-dialog__btn mp-dialog__btn--ghost"
            disabled={saving || uploading}
            onClick={onClose}
          >
            Hủy
          </button>
          <button type="submit" className="mp-dialog__btn mp-dialog__btn--primary" disabled={saving || uploading}>
            {saving ? "Đang lưu..." : "Thêm tài nguyên"}
          </button>
        </div>
      </form>
    </div>
  );
}
